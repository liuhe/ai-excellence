package com.proxy.manager.infrastructure.jpa.springdata;

import com.proxy.manager.infrastructure.jpa.entity.RequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RequestSpringRepo extends JpaRepository<RequestEntity, Long> {
    Optional<RequestEntity> findByProxyInstanceIdAndLocalRequestId(long proxyInstanceId, long localRequestId);
    List<RequestEntity> findByUsername(String username);
}
