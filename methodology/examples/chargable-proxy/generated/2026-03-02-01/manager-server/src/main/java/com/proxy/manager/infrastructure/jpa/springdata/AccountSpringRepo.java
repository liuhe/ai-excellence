package com.proxy.manager.infrastructure.jpa.springdata;

import com.proxy.manager.infrastructure.jpa.entity.AccountEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AccountSpringRepo extends JpaRepository<AccountEntity, Long> {
    Optional<AccountEntity> findByUsername(String username);
}
