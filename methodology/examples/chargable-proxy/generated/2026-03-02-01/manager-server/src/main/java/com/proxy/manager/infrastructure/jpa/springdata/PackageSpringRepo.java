package com.proxy.manager.infrastructure.jpa.springdata;

import com.proxy.manager.infrastructure.jpa.entity.PackageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PackageSpringRepo extends JpaRepository<PackageEntity, Long> {
    List<PackageEntity> findByUsername(String username);

    @Modifying
    @Query("UPDATE PackageEntity p SET p.usedQuota = :usedQuota, p.status = :status, " +
           "p.activateTime = :activateTime, p.expireTime = :expireTime WHERE p.id = :id")
    int updateUsedQuotaAndStatus(@Param("id") Long id,
                                  @Param("usedQuota") long usedQuota,
                                  @Param("status") String status,
                                  @Param("activateTime") long activateTime,
                                  @Param("expireTime") long expireTime);
}
