package com.proxy.manager.repository;

import com.proxy.manager.domain.ProxyRequest;
import java.util.List;
import java.util.Optional;

public interface RequestRepository {
    void upsertAll(List<ProxyRequest> requests);
    Optional<ProxyRequest> findByInstanceAndLocalId(long proxyInstanceId, long localRequestId);
    List<ProxyRequest> findByUsername(String username);
}
