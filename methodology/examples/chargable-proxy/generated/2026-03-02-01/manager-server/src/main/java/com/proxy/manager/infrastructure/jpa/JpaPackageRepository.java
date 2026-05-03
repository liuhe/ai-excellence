package com.proxy.manager.infrastructure.jpa;

import com.proxy.manager.domain.ProxyPackage;
import com.proxy.manager.infrastructure.jpa.entity.PackageEntity;
import com.proxy.manager.infrastructure.jpa.springdata.PackageSpringRepo;
import com.proxy.manager.repository.PackageRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
@Profile("jpa")
public class JpaPackageRepository implements PackageRepository {

    private final PackageSpringRepo springRepo;

    public JpaPackageRepository(PackageSpringRepo springRepo) {
        this.springRepo = springRepo;
    }

    @Override
    public ProxyPackage save(ProxyPackage pkg) {
        return springRepo.save(PackageEntity.fromModel(pkg)).toModel();
    }

    @Override
    public List<ProxyPackage> saveAll(List<ProxyPackage> packages) {
        List<PackageEntity> entities = packages.stream().map(PackageEntity::fromModel).toList();
        return springRepo.saveAll(entities).stream().map(PackageEntity::toModel).toList();
    }

    @Override
    public Optional<ProxyPackage> findById(Long id) {
        return springRepo.findById(id).map(PackageEntity::toModel);
    }

    @Override
    public List<ProxyPackage> findByUsername(String username) {
        return springRepo.findByUsername(username).stream().map(PackageEntity::toModel).toList();
    }

    @Override
    public List<ProxyPackage> findAll() {
        return springRepo.findAll().stream().map(PackageEntity::toModel).toList();
    }

    @Override
    @Transactional
    public int updateUsedQuotaAndStatus(Long id, long usedQuota, String status, long activateTime, long expireTime) {
        return springRepo.updateUsedQuotaAndStatus(id, usedQuota, status, activateTime, expireTime);
    }
}
