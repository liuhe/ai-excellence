package com.proxy.manager.infrastructure.jpa.entity;

import com.proxy.manager.domain.PackageStatus;
import com.proxy.manager.domain.ProxyPackage;
import jakarta.persistence.*;

@Entity
@Table(name = "proxy_package")
public class PackageEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String username;

    @Column(nullable = false, length = 128)
    private String domain;

    @Column(nullable = false, length = 32)
    private String type;

    @Column(nullable = false)
    private long quota;

    @Column(name = "effective_days", nullable = false)
    private int effectiveDays;

    @Column(name = "used_quota", nullable = false)
    private long usedQuota;

    @Column(nullable = false, length = 16)
    @Enumerated(EnumType.STRING)
    private PackageStatus status = PackageStatus.Pending;

    @Column(name = "activate_time", nullable = false)
    private long activateTime;

    @Column(name = "expire_time", nullable = false)
    private long expireTime;

    public PackageEntity() {}

    public static PackageEntity fromModel(ProxyPackage m) {
        PackageEntity e = new PackageEntity();
        e.id = m.id();
        e.username = m.username();
        e.domain = m.domain();
        e.type = m.type();
        e.quota = m.quota();
        e.effectiveDays = m.effectiveDays();
        e.usedQuota = m.usedQuota();
        e.status = m.status();
        e.activateTime = m.activateTime();
        e.expireTime = m.expireTime();
        return e;
    }

    public ProxyPackage toModel() {
        return new ProxyPackage(id, username, domain, type, quota, effectiveDays,
                usedQuota, status, activateTime, expireTime);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public long getQuota() { return quota; }
    public void setQuota(long quota) { this.quota = quota; }
    public int getEffectiveDays() { return effectiveDays; }
    public void setEffectiveDays(int effectiveDays) { this.effectiveDays = effectiveDays; }
    public long getUsedQuota() { return usedQuota; }
    public void setUsedQuota(long usedQuota) { this.usedQuota = usedQuota; }
    public PackageStatus getStatus() { return status; }
    public void setStatus(PackageStatus status) { this.status = status; }
    public long getActivateTime() { return activateTime; }
    public void setActivateTime(long activateTime) { this.activateTime = activateTime; }
    public long getExpireTime() { return expireTime; }
    public void setExpireTime(long expireTime) { this.expireTime = expireTime; }
}
