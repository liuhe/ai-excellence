package com.proxy.manager.infrastructure.jpa.entity;

import com.proxy.manager.domain.ProxyInstance;
import jakarta.persistence.*;

@Entity
@Table(name = "proxy_instance")
public class ProxyInstanceEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String domain;

    public ProxyInstanceEntity() {}

    public static ProxyInstanceEntity fromModel(ProxyInstance m) {
        ProxyInstanceEntity e = new ProxyInstanceEntity();
        e.id = m.id();
        e.domain = m.domain();
        return e;
    }

    public ProxyInstance toModel() {
        return new ProxyInstance(id, domain);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }
}
