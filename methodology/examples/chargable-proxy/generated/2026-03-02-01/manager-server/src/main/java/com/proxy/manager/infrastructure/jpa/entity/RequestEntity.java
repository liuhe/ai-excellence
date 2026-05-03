package com.proxy.manager.infrastructure.jpa.entity;

import com.proxy.manager.domain.ProxyRequest;
import jakarta.persistence.*;

@Entity
@Table(name = "proxy_request")
public class RequestEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "proxy_instance_id", nullable = false)
    private long proxyInstanceId;

    @Column(name = "proxy_domain", nullable = false, length = 128)
    private String proxyDomain;

    @Column(name = "local_request_id", nullable = false)
    private long localRequestId;

    @Column(nullable = false, length = 64)
    private String username;

    @Column(name = "client_addr", length = 64)
    private String clientAddr;

    @Column(length = 256)
    private String host;

    @Column(length = 1024)
    private String path;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @Column(name = "sec_ch_ua", length = 256)
    private String secChUa;

    @Column(length = 128)
    private String tags;

    @Column(name = "read_bytes", nullable = false)
    private long readBytes;

    public RequestEntity() {}

    public static RequestEntity fromModel(ProxyRequest m) {
        RequestEntity e = new RequestEntity();
        e.id = m.id();
        e.proxyInstanceId = m.proxyInstanceId();
        e.proxyDomain = m.proxyDomain();
        e.localRequestId = m.localRequestId();
        e.username = m.username();
        e.clientAddr = m.clientAddr();
        e.host = m.host();
        e.path = m.path();
        e.userAgent = m.userAgent();
        e.secChUa = m.secChUa();
        e.tags = m.tags();
        e.readBytes = m.readBytes();
        return e;
    }

    public ProxyRequest toModel() {
        return new ProxyRequest(id, proxyInstanceId, proxyDomain, localRequestId,
                username, clientAddr, host, path, userAgent, secChUa, tags, readBytes);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public long getProxyInstanceId() { return proxyInstanceId; }
    public void setProxyInstanceId(long proxyInstanceId) { this.proxyInstanceId = proxyInstanceId; }
    public String getProxyDomain() { return proxyDomain; }
    public void setProxyDomain(String proxyDomain) { this.proxyDomain = proxyDomain; }
    public long getLocalRequestId() { return localRequestId; }
    public void setLocalRequestId(long localRequestId) { this.localRequestId = localRequestId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getClientAddr() { return clientAddr; }
    public void setClientAddr(String clientAddr) { this.clientAddr = clientAddr; }
    public String getHost() { return host; }
    public void setHost(String host) { this.host = host; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
    public String getSecChUa() { return secChUa; }
    public void setSecChUa(String secChUa) { this.secChUa = secChUa; }
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    public long getReadBytes() { return readBytes; }
    public void setReadBytes(long readBytes) { this.readBytes = readBytes; }
}
