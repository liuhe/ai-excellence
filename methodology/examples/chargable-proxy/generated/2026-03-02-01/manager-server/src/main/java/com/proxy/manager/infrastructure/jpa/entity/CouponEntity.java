package com.proxy.manager.infrastructure.jpa.entity;

import com.proxy.manager.domain.Coupon;
import jakarta.persistence.*;

@Entity
@Table(name = "proxy_coupon")
public class CouponEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 32)
    private String code;

    @Column(nullable = false, length = 128)
    private String domain;

    @Column(nullable = false, length = 32)
    private String type;

    @Column(nullable = false)
    private long quota;

    @Column(name = "effective_days", nullable = false)
    private int effectiveDays;

    @Column(name = "bound_username", length = 64)
    private String boundUsername;

    @Column(name = "bound_time", nullable = false)
    private long boundTime;

    public CouponEntity() {}

    public static CouponEntity fromModel(Coupon m) {
        CouponEntity e = new CouponEntity();
        e.id = m.id();
        e.code = m.code();
        e.domain = m.domain();
        e.type = m.type();
        e.quota = m.quota();
        e.effectiveDays = m.effectiveDays();
        e.boundUsername = m.boundUsername();
        e.boundTime = m.boundTime();
        return e;
    }

    public Coupon toModel() {
        return new Coupon(id, code, domain, type, quota, effectiveDays, boundUsername, boundTime);
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public long getQuota() { return quota; }
    public void setQuota(long quota) { this.quota = quota; }
    public int getEffectiveDays() { return effectiveDays; }
    public void setEffectiveDays(int effectiveDays) { this.effectiveDays = effectiveDays; }
    public String getBoundUsername() { return boundUsername; }
    public void setBoundUsername(String boundUsername) { this.boundUsername = boundUsername; }
    public long getBoundTime() { return boundTime; }
    public void setBoundTime(long boundTime) { this.boundTime = boundTime; }
}
