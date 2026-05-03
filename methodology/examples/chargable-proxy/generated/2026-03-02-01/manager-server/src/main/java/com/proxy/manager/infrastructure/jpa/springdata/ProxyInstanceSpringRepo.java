package com.proxy.manager.infrastructure.jpa.springdata;

import com.proxy.manager.infrastructure.jpa.entity.ProxyInstanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProxyInstanceSpringRepo extends JpaRepository<ProxyInstanceEntity, Long> {
}
