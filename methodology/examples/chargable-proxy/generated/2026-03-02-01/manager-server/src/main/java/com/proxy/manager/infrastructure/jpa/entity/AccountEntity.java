package com.proxy.manager.infrastructure.jpa.entity;

import com.proxy.manager.domain.Account;
import jakarta.persistence.*;

@Entity
@Table(name = "proxy_user")
public class AccountEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String username;

    @Column(nullable = false, length = 64)
    private String password;

    public AccountEntity() {}

    public static AccountEntity fromModel(Account model) {
        AccountEntity e = new AccountEntity();
        e.id = model.id();
        e.username = model.username();
        e.password = model.password();
        return e;
    }

    public Account toModel() {
        return new Account(id, username, password);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
