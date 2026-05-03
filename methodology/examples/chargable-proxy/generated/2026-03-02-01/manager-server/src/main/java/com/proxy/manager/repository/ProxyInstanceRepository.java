package com.proxy.manager.repository;

import com.proxy.manager.domain.ProxyInstance;
import java.util.Optional;

public interface ProxyInstanceRepository {
    ProxyInstance save(ProxyInstance instance);
    Optional<ProxyInstance> findById(Long id);
}
