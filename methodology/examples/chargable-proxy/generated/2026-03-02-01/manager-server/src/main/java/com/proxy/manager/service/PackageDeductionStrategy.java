package com.proxy.manager.service;

import com.proxy.manager.domain.PackageStatus;
import com.proxy.manager.domain.ProxyPackage;

import java.util.*;
import java.util.stream.Collectors;

public class PackageDeductionStrategy {

    public record DeductionResult(List<PackageUpdate> updates, long undeducted) {}

    public record PackageUpdate(Long packageId, long newUsedQuota, PackageStatus newStatus,
                                long activateTime, long expireTime) {}

    public DeductionResult deduct(List<ProxyPackage> userPackages, String tag, long bytes, long now) {
        if (bytes <= 0 || userPackages.isEmpty()) {
            return new DeductionResult(Collections.emptyList(), bytes);
        }

        List<ProxyPackage> enriched = userPackages.stream()
                .map(p -> {
                    PackageStatus eff = p.effectiveStatus();
                    if (eff != p.status()) {
                        return p.withStatus(eff);
                    }
                    return p;
                })
                .collect(Collectors.toList());

        List<PackageUpdate> updates = new ArrayList<>();
        long remaining = bytes;

        remaining = deductFromMatching(enriched, tag, PackageStatus.Active, true, updates, remaining, now);
        remaining = deductFromMatching(enriched, tag, PackageStatus.Pending, true, updates, remaining, now);

        if (!"freedom".equals(tag)) {
            remaining = deductFromMatching(enriched, "freedom", PackageStatus.Active, true, updates, remaining, now);
            remaining = deductFromMatching(enriched, "freedom", PackageStatus.Pending, true, updates, remaining, now);
        }

        remaining = deductFromMatching(enriched, null, PackageStatus.Expired, false, updates, remaining, now);
        remaining = deductFromMatching(enriched, null, PackageStatus.Exhausted, false, updates, remaining, now);

        return new DeductionResult(updates, remaining);
    }

    private long deductFromMatching(List<ProxyPackage> packages, String type, PackageStatus status,
                                     boolean oldFirst, List<PackageUpdate> updates, long remaining, long now) {
        if (remaining <= 0) return 0;

        List<ProxyPackage> matched = packages.stream()
                .filter(p -> p.effectiveStatus() == status)
                .filter(p -> type == null || p.type().equals(type))
                .sorted(oldFirst
                        ? Comparator.comparingLong(ProxyPackage::id)
                        : Comparator.comparingLong(ProxyPackage::id).reversed())
                .toList();

        for (ProxyPackage pkg : matched) {
            if (remaining <= 0) break;

            long newUsedQuota = pkg.usedQuota();
            PackageStatus newStatus = pkg.status();
            long activateTime = pkg.activateTime();
            long expireTime = pkg.expireTime();

            if (status == PackageStatus.Pending) {
                newStatus = PackageStatus.Active;
                activateTime = now;
                expireTime = now + (long) pkg.effectiveDays() * 86400000L;
            }

            if (status == PackageStatus.Exhausted || status == PackageStatus.Expired) {
                newUsedQuota += remaining;
                remaining = 0;
            } else {
                long available = pkg.quota() - pkg.usedQuota();
                if (available <= 0) continue;
                long toDeduct = Math.min(remaining, available);
                newUsedQuota += toDeduct;
                remaining -= toDeduct;

                if (newUsedQuota >= pkg.quota()) {
                    newStatus = PackageStatus.Exhausted;
                }
            }

            updates.add(new PackageUpdate(pkg.id(), newUsedQuota, newStatus, activateTime, expireTime));
        }

        return remaining;
    }
}
