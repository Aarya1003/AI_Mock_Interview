package com.aiinterview.backend.interview;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterruptionRepository extends JpaRepository<Interruption, Long> {
    List<Interruption> findByInterviewOrderByTimestampSecondsAsc(Interview interview);
    long countByInterviewAndType(Interview interview, Interruption.Type type);
}