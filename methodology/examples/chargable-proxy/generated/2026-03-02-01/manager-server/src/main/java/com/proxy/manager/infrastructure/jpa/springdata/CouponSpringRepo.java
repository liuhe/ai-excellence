package com.proxy.manager.infrastructure.jpa.springdata;

import com.proxy.manager.infrastructure.jpa.entity.CouponEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface CouponSpringRepo extends JpaRepository<CouponEntity, Integer> {
    Optional<CouponEntity> findByCode(String code);

    @Modifying
    @Query("UPDATE CouponEntity c SET c.boundUsername = :username, c.boundTime = :boundTime " +
           "WHERE c.code = :code AND c.boundUsername IS NULL")
    int bindCoupon(@Param("code") String code,
                   @Param("username") String username,
                   @Param("boundTime") long boundTime);
}
