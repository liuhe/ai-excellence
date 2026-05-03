package com.proxy.manager.infrastructure.memory;

import com.proxy.manager.domain.ProxyInstance;
import com.proxy.manager.repository.ProxyInstanceRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
@Profile("memory")
public class InMemoryProxyInstanceRepository implements ProxyInstanceRepository {

    private final Map<Long, ProxyInstance> store = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(1);

    @Override
    public ProxyInstance save(ProxyInstance instance) {
        Long id = instance.id() != null ? instance.id() : idGen.getAndIncrement();
        ProxyInstance saved = new ProxyInstance(id, instance.domain());
        store.put(id, saved);
        return saved;
    }

    @Override
    public Optional<ProxyInstance> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }
}
