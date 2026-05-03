package com.proxy.manager.repository;

import com.proxy.manager.domain.Coupon;
import java.util.List;
import java.util.Optional;

public interface CouponRepository {
    Coupon save(Coupon coupon);
    List<Coupon> saveAll(List<Coupon> coupons);
    Optional<Coupon> findByCode(String code);
    int bindCoupon(String code, String username, long boundTime);
}
