package com.proxy.manager.domain;

public record ProxyPackage(
        Long id,
        String username,
        String domain,
        String type,
        long quota,
        int effectiveDays,
        long usedQuota,
        PackageStatus status,
        long activateTime,
        long expireTime
) {
    public PackageStatus effectiveStatus() {
        if (status == PackageStatus.Active && expireTime > 0 && System.currentTimeMillis() > expireTime) {
            return PackageStatus.Expired;
        }
        return status;
    }

    public ProxyPackage withUsedQuota(long newUsedQuota) {
        return new ProxyPackage(id, username, domain, type, quota, effectiveDays,
                newUsedQuota, status, activateTime, expireTime);
    }

    public ProxyPackage activate(long now) {
        long expire = now + (long) effectiveDays * 86400000L;
        return new ProxyPackage(id, username, domain, type, quota, effectiveDays,
                usedQuota, PackageStatus.Active, now, expire);
    }

    public ProxyPackage withStatus(PackageStatus newStatus) {
        return new ProxyPackage(id, username, domain, type, quota, effectiveDays,
                usedQuota, newStatus, activateTime, expireTime);
    }

    public boolean isAvailable() {
        PackageStatus eff = effectiveStatus();
        return eff == PackageStatus.Pending || eff == PackageStatus.Active;
    }

    public long remainingQuota() {
        return quota - usedQuota;
    }
}
