package com.aiinterview.backend.question;

import com.aiinterview.backend.interview.Interview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionAnswerRepository extends JpaRepository<QuestionAnswer, Long> {
    List<QuestionAnswer> findByInterviewOrderByQuestionIndexAsc(Interview interview);
    
    Optional<QuestionAnswer> findByInterviewAndQuestionIndex(Interview interview, Integer questionIndex);
    
    Optional<QuestionAnswer> findByInterviewAndStatusOrderByQuestionIndexAsc(Interview interview, QuestionAnswer.Status status);
    
    @Query("SELECT qa FROM QuestionAnswer qa WHERE qa.interview = :interview AND qa.status = :status ORDER BY qa.questionIndex ASC")
    List<QuestionAnswer> findByInterviewAndStatus(Interview interview, QuestionAnswer.Status status);
    
    long countByInterviewAndIsFollowUpFalse(Interview interview);
}