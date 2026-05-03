package com.proxy.manager.service;

import com.proxy.manager.domain.Account;
import com.proxy.manager.domain.PackageStatus;
import com.proxy.manager.domain.ProxyPackage;
import com.proxy.manager.repository.AccountRepository;
import com.proxy.manager.repository.PackageRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class AccountService {

    private final AccountRepository accountRepo;
    private final PackageRepository packageRepo;
    private final String adminKey;

    public AccountService(AccountRepository accountRepo, PackageRepository packageRepo,
                          @Qualifier("adminKey") String adminKey) {
        this.accountRepo = accountRepo;
        this.packageRepo = packageRepo;
        this.adminKey = adminKey;
    }

    @Transactional
    public List<Account> createAccounts(String key, String idPrefix, int count,
                                         String domain, String type, long quota, int effectiveDays) {
        validateAdminKey(key);

        List<Account> accounts = new ArrayList<>();
        List<ProxyPackage> packages = new ArrayList<>();

        for (int i = 1; i <= count; i++) {
            String username = idPrefix + String.format("%03d", i);
            String password = generatePassword();
            Account account = new Account(null, username, password);
            accounts.add(account);

            ProxyPackage pkg = new ProxyPackage(null, username, domain, type,
                    quota, effectiveDays, 0, PackageStatus.Pending, 0, 0);
            packages.add(pkg);
        }

        List<Account> saved = accountRepo.saveAll(accounts);
        packageRepo.saveAll(packages);
        return saved;
    }

    public Account authenticate(String username, String password) {
        if (password != null && password.equals(adminKey)) {
            return accountRepo.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        }
        Account account = accountRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (!account.password().equals(password)) {
            throw new IllegalArgumentException("Invalid password");
        }
        return account;
    }

    public record AccountDetail(String username, List<ProxyPackage> packages) {}

    public AccountDetail queryAccountDetail(String username, String password) {
        Account account = authenticate(username, password);
        List<ProxyPackage> packages = packageRepo.findByUsername(account.username());
        List<ProxyPackage> withEffective = packages.stream()
                .map(p -> p.effectiveStatus() != p.status() ? p.withStatus(p.effectiveStatus()) : p)
                .toList();
        return new AccountDetail(account.username(), withEffective);
    }

    public void validateAdminKey(String key) {
        if (!adminKey.equals(key)) {
            throw new IllegalArgumentException("Invalid admin key");
        }
    }

    private String generatePassword() {
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            sb.append(ThreadLocalRandom.current().nextInt(10));
        }
        return sb.toString();
    }
}
