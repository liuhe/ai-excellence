package com.proxy.manager.repository;

import com.proxy.manager.domain.ProxyPackage;
import java.util.List;
import java.util.Optional;

public interface PackageRepository {
    ProxyPackage save(ProxyPackage pkg);
    List<ProxyPackage> saveAll(List<ProxyPackage> packages);
    Optional<ProxyPackage> findById(Long id);
    List<ProxyPackage> findByUsername(String username);
    List<ProxyPackage> findAll();
    int updateUsedQuotaAndStatus(Long id, long usedQuota, String status, long activateTime, long expireTime);
}
