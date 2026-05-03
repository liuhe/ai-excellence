package com.proxy.manager.service;

import com.proxy.manager.domain.Coupon;
import com.proxy.manager.domain.PackageStatus;
import com.proxy.manager.domain.ProxyPackage;
import com.proxy.manager.repository.CouponRepository;
import com.proxy.manager.repository.PackageRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class CouponService {

    private final CouponRepository couponRepo;
    private final PackageRepository packageRepo;
    private final String adminKey;

    public CouponService(CouponRepository couponRepo, PackageRepository packageRepo,
                          @Qualifier("adminKey") String adminKey) {
        this.couponRepo = couponRepo;
        this.packageRepo = packageRepo;
        this.adminKey = adminKey;
    }

    @Transactional
    public List<Coupon> createCoupons(String key, String domain, String type,
                                       long quota, int effectiveDays, int count) {
        if (!adminKey.equals(key)) {
            throw new IllegalArgumentException("Invalid admin key");
        }
        List<String> codes = CouponCodeGenerator.generateBatch(count);
        List<Coupon> coupons = new ArrayList<>();
        for (String code : codes) {
            coupons.add(new Coupon(null, code, domain, type, quota, effectiveDays, null, 0));
        }
        return couponRepo.saveAll(coupons);
    }

    @Transactional
    public ProxyPackage redeemCoupon(String username, String couponCode) {
        Coupon coupon = couponRepo.findByCode(couponCode.toUpperCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid coupon code"));

        if (coupon.isBound()) {
            throw new IllegalArgumentException("Coupon already used");
        }

        long now = System.currentTimeMillis();
        int updated = couponRepo.bindCoupon(coupon.code(), username, now);
        if (updated == 0) {
            throw new IllegalArgumentException("Coupon already used (concurrent)");
        }

        ProxyPackage pkg = new ProxyPackage(null, username, coupon.domain(), coupon.type(),
                coupon.quota(), coupon.effectiveDays(), 0, PackageStatus.Pending, 0, 0);
        return packageRepo.save(pkg);
    }
}
