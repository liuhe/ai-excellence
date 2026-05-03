package com.proxy.manager.controller;

import com.proxy.manager.domain.ProxyInstance;
import com.proxy.manager.domain.ProxyPackage;
import com.proxy.manager.domain.ProxyRequest;
import com.proxy.manager.repository.AccountRepository;
import com.proxy.manager.service.SyncService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/internal")
public class InternalController {

    private final SyncService syncService;
    private final AccountRepository accountRepo;

    public InternalController(SyncService syncService, AccountRepository accountRepo) {
        this.syncService = syncService;
        this.accountRepo = accountRepo;
    }

    @PostMapping("/register-instance")
    public ProxyInstance registerInstance(@RequestBody Map<String, String> body) {
        String domain = body.get("domain");
        return syncService.registerInstance(domain);
    }

    public record AvailablePackageDto(String username, String password, List<PackageDto> packages) {}
    public record PackageDto(Long id, String domain, String type, long quota, int effectiveDays,
                              long usedQuota, String status) {
        public static PackageDto from(ProxyPackage p) {
            return new PackageDto(p.id(), p.domain(), p.type(), p.quota(), p.effectiveDays(),
                    p.usedQuota(), p.effectiveStatus().name());
        }
    }

    @GetMapping("/available-packages")
    public List<AvailablePackageDto> getAvailablePackages() {
        return syncService.getAvailablePackages(accountRepo).stream()
                .map(e -> new AvailablePackageDto(e.username(), e.password(),
                        e.packages().stream().map(PackageDto::from).toList()))
                .toList();
    }

    public record SyncRequestDto(long proxyInstanceId, String proxyDomain, long localRequestId,
                                  String username, String clientAddr, String host, String path,
                                  String userAgent, String secChUa, String tags, long readBytes) {
        public ProxyRequest toModel() {
            return new ProxyRequest(null, proxyInstanceId, proxyDomain, localRequestId,
                    username, clientAddr, host, path, userAgent, secChUa, tags, readBytes);
        }
    }

    @PostMapping("/sync-usage")
    public Map<String, String> syncUsage(@RequestBody List<SyncRequestDto> requests) {
        List<ProxyRequest> models = requests.stream().map(SyncRequestDto::toModel).toList();
        syncService.syncUsage(models);
        return Map.of("status", "ok");
    }
}
