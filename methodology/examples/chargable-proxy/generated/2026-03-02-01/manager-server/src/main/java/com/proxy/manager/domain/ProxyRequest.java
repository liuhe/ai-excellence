package com.proxy.manager.domain;

public record ProxyRequest(
        Long id,
        long proxyInstanceId,
        String proxyDomain,
        long localRequestId,
        String username,
        String clientAddr,
        String host,
        String path,
        String userAgent,
        String secChUa,
        String tags,
        long readBytes
) {
}
