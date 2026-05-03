package com.proxy.manager.domain;

public record Coupon(
        Integer id,
        String code,
        String domain,
        String type,
        long quota,
        int effectiveDays,
        String boundUsername,
        long boundTime
) {
    public boolean isBound() {
        return boundUsername != null && !boundUsername.isEmpty();
    }

    public Coupon bind(String username, long now) {
        return new Coupon(id, code, domain, type, quota, effectiveDays, username, now);
    }
}
