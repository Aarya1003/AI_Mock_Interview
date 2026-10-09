package com.aiinterview.backend.role;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<RoleEntity, Long> {
    Optional<RoleEntity> findByName(String name);
    List<RoleEntity> findByCategory(String category);
    List<RoleEntity> findByCustomFalseOrderByCategoryAscNameAsc();
    List<RoleEntity> findByCustomTrue();
}