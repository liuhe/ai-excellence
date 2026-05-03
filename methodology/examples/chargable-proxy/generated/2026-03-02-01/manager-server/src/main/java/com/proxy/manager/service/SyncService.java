package com.proxy.manager.service;

import com.proxy.manager.domain.ProxyInstance;
import com.proxy.manager.domain.ProxyPackage;
import com.proxy.manager.domain.ProxyRequest;
import com.proxy.manager.repository.PackageRepository;
import com.proxy.manager.repository.ProxyInstanceRepository;
import com.proxy.manager.repository.RequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SyncService {

    private static final Logger log = LoggerFactory.getLogger(SyncService.class);

    private final RequestRepository requestRepo;
    private final PackageRepository packageRepo;
    private final ProxyInstanceRepository instanceRepo;
    private final PackageDeductionStrategy deductionStrategy = new PackageDeductionStrategy();

    public SyncService(RequestRepository requestRepo, PackageRepository packageRepo,
                       ProxyInstanceRepository instanceRepo) {
        this.requestRepo = requestRepo;
        this.packageRepo = packageRepo;
        this.instanceRepo = instanceRepo;
    }

    public ProxyInstance registerInstance(String domain) {
        return instanceRepo.save(new ProxyInstance(null, domain));
    }

    public record AvailablePackageEntry(String username, String password, List<ProxyPackage> packages) {}

    public List<AvailablePackageEntry> getAvailablePackages(
            com.proxy.manager.repository.AccountRepository accountRepo) {
        var accounts = accountRepo.findAll();
        var allPackages = packageRepo.findAll();

        Map<String, List<ProxyPackage>> byUser = allPackages.stream()
                .filter(ProxyPackage::isAvailable)
                .collect(Collectors.groupingBy(ProxyPackage::username));

        List<AvailablePackageEntry> result = new ArrayList<>();
        for (var account : accounts) {
            List<ProxyPackage> pkgs = byUser.getOrDefault(account.username(), Collections.emptyList());
            result.add(new AvailablePackageEntry(account.username(), account.password(), pkgs));
        }
        return result;
    }

    @Transactional
    public void syncUsage(List<ProxyRequest> requests) {
        Map<String, Long> previousBytes = new HashMap<>();
        for (ProxyRequest req : requests) {
            Optional<ProxyRequest> existing = requestRepo.findByInstanceAndLocalId(
                    req.proxyInstanceId(), req.localRequestId());
            existing.ifPresent(e -> previousBytes.put(
                    req.proxyInstanceId() + ":" + req.localRequestId(), e.readBytes()));
        }

        requestRepo.upsertAll(requests);

        Map<String, Long> deltaByUser = new HashMap<>();
        for (ProxyRequest req : requests) {
            String key = req.proxyInstanceId() + ":" + req.localRequestId();
            long prev = previousBytes.getOrDefault(key, 0L);
            long delta = req.readBytes() - prev;
            if (delta > 0) {
                deltaByUser.merge(req.username(), delta, Long::sum);
            }
        }

        long now = System.currentTimeMillis();
        for (var entry : deltaByUser.entrySet()) {
            String username = entry.getKey();
            long totalDelta = entry.getValue();

            List<ProxyPackage> userPackages = packageRepo.findByUsername(username);
            String primaryTag = determinePrimaryTag(requests, username);

            PackageDeductionStrategy.DeductionResult result =
                    deductionStrategy.deduct(userPackages, primaryTag, totalDelta, now);

            for (var update : result.updates()) {
                packageRepo.updateUsedQuotaAndStatus(
                        update.packageId(), update.newUsedQuota(),
                        update.newStatus().name(), update.activateTime(), update.expireTime());
            }

            if (result.undeducted() > 0) {
                log.warn("User {} has {} undeducted bytes", username, result.undeducted());
            }
        }
    }

    private String determinePrimaryTag(List<ProxyRequest> requests, String username) {
        return requests.stream()
                .filter(r -> r.username().equals(username))
                .map(ProxyRequest::tags)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse("freedom");
    }
}
