package com.proxy.manager.infrastructure.jpa;

import com.proxy.manager.domain.ProxyInstance;
import com.proxy.manager.infrastructure.jpa.entity.ProxyInstanceEntity;
import com.proxy.manager.infrastructure.jpa.springdata.ProxyInstanceSpringRepo;
import com.proxy.manager.repository.ProxyInstanceRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@Profile("jpa")
public class JpaProxyInstanceRepository implements ProxyInstanceRepository {

    private final ProxyInstanceSpringRepo springRepo;

    public JpaProxyInstanceRepository(ProxyInstanceSpringRepo springRepo) {
        this.springRepo = springRepo;
    }

    @Override
    public ProxyInstance save(ProxyInstance instance) {
        return springRepo.save(ProxyInstanceEntity.fromModel(instance)).toModel();
    }

    @Override
    public Optional<ProxyInstance> findById(Long id) {
        return springRepo.findById(id).map(ProxyInstanceEntity::toModel);
    }
}
