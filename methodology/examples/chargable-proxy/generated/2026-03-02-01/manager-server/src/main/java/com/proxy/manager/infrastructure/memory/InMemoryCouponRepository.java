package com.proxy.manager.infrastructure.memory;

import com.proxy.manager.domain.Coupon;
import com.proxy.manager.repository.CouponRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Repository
@Profile("memory")
public class InMemoryCouponRepository implements CouponRepository {

    private final Map<Integer, Coupon> store = new ConcurrentHashMap<>();
    private final AtomicInteger idGen = new AtomicInteger(1);

    @Override
    public Coupon save(Coupon coupon) {
        Integer id = coupon.id() != null ? coupon.id() : idGen.getAndIncrement();
        Coupon saved = new Coupon(id, coupon.code(), coupon.domain(), coupon.type(),
                coupon.quota(), coupon.effectiveDays(), coupon.boundUsername(), coupon.boundTime());
        store.put(id, saved);
        return saved;
    }

    @Override
    public List<Coupon> saveAll(List<Coupon> coupons) {
        return coupons.stream().map(this::save).toList();
    }

    @Override
    public Optional<Coupon> findByCode(String code) {
        return store.values().stream().filter(c -> c.code().equals(code)).findFirst();
    }

    @Override
    public synchronized int bindCoupon(String code, String username, long boundTime) {
        Optional<Coupon> opt = findByCode(code);
        if (opt.isEmpty() || opt.get().isBound()) return 0;
        Coupon bound = opt.get().bind(username, boundTime);
        store.put(bound.id(), bound);
        return 1;
    }
}
