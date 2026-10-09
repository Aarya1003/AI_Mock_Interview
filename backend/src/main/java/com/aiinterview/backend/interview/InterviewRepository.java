package com.aiinterview.backend.interview;

import com.aiinterview.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewRepository extends JpaRepository<Interview, Long> {
    List<Interview> findByUserOrderByCreatedAtDesc(User user);
    
    List<Interview> findByUserAndStatusIn(User user, List<Interview.Status> statuses);
    
    @Query("SELECT i FROM Interview i WHERE i.user = :user AND i.status = :status ORDER BY i.createdAt DESC")
    List<Interview> findByUserAndStatus(User user, Interview.Status status);
    
    Optional<Interview> findByIdAndUser(Long id, User user);
    
    long countByUserAndCreatedAtAfter(User user, LocalDateTime since);
    
    @Query("SELECT COUNT(i) FROM Interview i WHERE i.user = :user AND i.status IN (:statuses) AND i.createdAt >= :since")
    long countByUserAndStatusInAndCreatedAtAfter(User user, List<Interview.Status> statuses, LocalDateTime since);

    @Query("SELECT i FROM Interview i WHERE i.user = :user AND i.id != :currentId AND i.status IN (:statuses) ORDER BY i.createdAt DESC")
    List<Interview> findPreviousCompletedInterviews(User user, Long currentId, List<Interview.Status> statuses);
}