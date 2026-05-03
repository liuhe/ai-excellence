package com.proxy.manager.infrastructure.jpa;

import com.proxy.manager.domain.ProxyRequest;
import com.proxy.manager.infrastructure.jpa.entity.RequestEntity;
import com.proxy.manager.infrastructure.jpa.springdata.RequestSpringRepo;
import com.proxy.manager.repository.RequestRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
@Profile("jpa")
public class JpaRequestRepository implements RequestRepository {

    private final RequestSpringRepo springRepo;

    public JpaRequestRepository(RequestSpringRepo springRepo) {
        this.springRepo = springRepo;
    }

    @Override
    @Transactional
    public void upsertAll(List<ProxyRequest> requests) {
        for (ProxyRequest req : requests) {
            Optional<RequestEntity> existing = springRepo
                    .findByProxyInstanceIdAndLocalRequestId(req.proxyInstanceId(), req.localRequestId());
            if (existing.isPresent()) {
                RequestEntity entity = existing.get();
                entity.setReadBytes(req.readBytes());
                entity.setTags(req.tags());
                springRepo.save(entity);
            } else {
                springRepo.save(RequestEntity.fromModel(req));
            }
        }
    }

    @Override
    public Optional<ProxyRequest> findByInstanceAndLocalId(long proxyInstanceId, long localRequestId) {
        return springRepo.findByProxyInstanceIdAndLocalRequestId(proxyInstanceId, localRequestId)
                .map(RequestEntity::toModel);
    }

    @Override
    public List<ProxyRequest> findByUsername(String username) {
        return springRepo.findByUsername(username).stream().map(RequestEntity::toModel).toList();
    }
}
