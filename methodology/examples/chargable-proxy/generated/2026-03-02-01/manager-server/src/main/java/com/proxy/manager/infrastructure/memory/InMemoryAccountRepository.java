package com.proxy.manager.infrastructure.memory;

import com.proxy.manager.domain.Account;
import com.proxy.manager.repository.AccountRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
@Profile("memory")
public class InMemoryAccountRepository implements AccountRepository {

    private final Map<Long, Account> store = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(1);

    @Override
    public Account save(Account account) {
        Long id = account.id() != null ? account.id() : idGen.getAndIncrement();
        Account saved = new Account(id, account.username(), account.password());
        store.put(id, saved);
        return saved;
    }

    @Override
    public List<Account> saveAll(List<Account> accounts) {
        return accounts.stream().map(this::save).toList();
    }

    @Override
    public Optional<Account> findByUsername(String username) {
        return store.values().stream().filter(a -> a.username().equals(username)).findFirst();
    }

    @Override
    public List<Account> findAll() {
        return new ArrayList<>(store.values());
    }
}
