package com.proxy.manager.infrastructure.jpa;

import com.proxy.manager.domain.Account;
import com.proxy.manager.infrastructure.jpa.entity.AccountEntity;
import com.proxy.manager.infrastructure.jpa.springdata.AccountSpringRepo;
import com.proxy.manager.repository.AccountRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@Profile("jpa")
public class JpaAccountRepository implements AccountRepository {

    private final AccountSpringRepo springRepo;

    public JpaAccountRepository(AccountSpringRepo springRepo) {
        this.springRepo = springRepo;
    }

    @Override
    public Account save(Account account) {
        return springRepo.save(AccountEntity.fromModel(account)).toModel();
    }

    @Override
    public List<Account> saveAll(List<Account> accounts) {
        List<AccountEntity> entities = accounts.stream().map(AccountEntity::fromModel).toList();
        return springRepo.saveAll(entities).stream().map(AccountEntity::toModel).toList();
    }

    @Override
    public Optional<Account> findByUsername(String username) {
        return springRepo.findByUsername(username).map(AccountEntity::toModel);
    }

    @Override
    public List<Account> findAll() {
        return springRepo.findAll().stream().map(AccountEntity::toModel).toList();
    }
}
