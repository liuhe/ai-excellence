package com.proxy.manager.repository;

import com.proxy.manager.domain.Account;
import java.util.List;
import java.util.Optional;

public interface AccountRepository {
    Account save(Account account);
    List<Account> saveAll(List<Account> accounts);
    Optional<Account> findByUsername(String username);
    List<Account> findAll();
}
