package com.proxy.manager.infrastructure.jpa;

import com.proxy.manager.domain.Coupon;
import com.proxy.manager.infrastructure.jpa.entity.CouponEntity;
import com.proxy.manager.infrastructure.jpa.springdata.CouponSpringRepo;
import com.proxy.manager.repository.CouponRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
@Profile("jpa")
public class JpaCouponRepository implements CouponRepository {

    private final CouponSpringRepo springRepo;

    public JpaCouponRepository(CouponSpringRepo springRepo) {
        this.springRepo = springRepo;
    }

    @Override
    public Coupon save(Coupon coupon) {
        return springRepo.save(CouponEntity.fromModel(coupon)).toModel();
    }

    @Override
    public List<Coupon> saveAll(List<Coupon> coupons) {
        List<CouponEntity> entities = coupons.stream().map(CouponEntity::fromModel).toList();
        return springRepo.saveAll(entities).stream().map(CouponEntity::toModel).toList();
    }

    @Override
    public Optional<Coupon> findByCode(String code) {
        return springRepo.findByCode(code).map(CouponEntity::toModel);
    }

    @Override
    @Transactional
    public int bindCoupon(String code, String username, long boundTime) {
        return springRepo.bindCoupon(code, username, boundTime);
    }
}
