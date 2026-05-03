package com.proxy.manager.infrastructure.memory;

import com.proxy.manager.domain.ProxyRequest;
import com.proxy.manager.repository.RequestRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
@Profile("memory")
public class InMemoryRequestRepository implements RequestRepository {

    private final Map<Long, ProxyRequest> store = new ConcurrentHashMap<>();
    private final Map<String, Long> compositeKeyIndex = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(1);

    private String compositeKey(long instanceId, long localId) {
        return instanceId + ":" + localId;
    }

    @Override
    public synchronized void upsertAll(List<ProxyRequest> requests) {
        for (ProxyRequest req : requests) {
            String key = compositeKey(req.proxyInstanceId(), req.localRequestId());
            Long existingId = compositeKeyIndex.get(key);
            if (existingId != null) {
                ProxyRequest existing = store.get(existingId);
                ProxyRequest updated = new ProxyRequest(existingId, req.proxyInstanceId(), req.proxyDomain(),
                        req.localRequestId(), req.username(), req.clientAddr(), req.host(), req.path(),
                        req.userAgent(), req.secChUa(), req.tags(), req.readBytes());
                store.put(existingId, updated);
            } else {
                long id = idGen.getAndIncrement();
                ProxyRequest saved = new ProxyRequest(id, req.proxyInstanceId(), req.proxyDomain(),
                        req.localRequestId(), req.username(), req.clientAddr(), req.host(), req.path(),
                        req.userAgent(), req.secChUa(), req.tags(), req.readBytes());
                store.put(id, saved);
                compositeKeyIndex.put(key, id);
            }
        }
    }

    @Override
    public Optional<ProxyRequest> findByInstanceAndLocalId(long proxyInstanceId, long localRequestId) {
        String key = compositeKey(proxyInstanceId, localRequestId);
        Long id = compositeKeyIndex.get(key);
        return id != null ? Optional.ofNullable(store.get(id)) : Optional.empty();
    }

    @Override
    public List<ProxyRequest> findByUsername(String username) {
        return store.values().stream().filter(r -> r.username().equals(username)).toList();
    }
}
