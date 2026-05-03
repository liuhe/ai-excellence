package com.proxy.manager.infrastructure.memory;

import com.proxy.manager.domain.PackageStatus;
import com.proxy.manager.domain.ProxyPackage;
import com.proxy.manager.repository.PackageRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
@Profile("memory")
public class InMemoryPackageRepository implements PackageRepository {

    private final Map<Long, ProxyPackage> store = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(1);

    @Override
    public ProxyPackage save(ProxyPackage pkg) {
        Long id = pkg.id() != null ? pkg.id() : idGen.getAndIncrement();
        ProxyPackage saved = new ProxyPackage(id, pkg.username(), pkg.domain(), pkg.type(),
                pkg.quota(), pkg.effectiveDays(), pkg.usedQuota(), pkg.status(),
                pkg.activateTime(), pkg.expireTime());
        store.put(id, saved);
        return saved;
    }

    @Override
    public List<ProxyPackage> saveAll(List<ProxyPackage> packages) {
        return packages.stream().map(this::save).toList();
    }

    @Override
    public Optional<ProxyPackage> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public List<ProxyPackage> findByUsername(String username) {
        return store.values().stream().filter(p -> p.username().equals(username)).toList();
    }

    @Override
    public List<ProxyPackage> findAll() {
        return new ArrayList<>(store.values());
    }

    @Override
    public int updateUsedQuotaAndStatus(Long id, long usedQuota, String status, long activateTime, long expireTime) {
        ProxyPackage existing = store.get(id);
        if (existing == null) return 0;
        ProxyPackage updated = new ProxyPackage(id, existing.username(), existing.domain(), existing.type(),
                existing.quota(), existing.effectiveDays(), usedQuota,
                PackageStatus.valueOf(status), activateTime, expireTime);
        store.put(id, updated);
        return 1;
    }
}
