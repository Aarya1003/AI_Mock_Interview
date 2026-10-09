package com.aiinterview.backend.interview;

import com.aiinterview.backend.question.QuestionAnswer;
import com.aiinterview.backend.question.QuestionAnswerRepository;
import com.aiinterview.backend.report.Report;
import com.aiinterview.backend.role.RoleEntity;
import com.aiinterview.backend.role.RoleRepository;
import com.aiinterview.backend.scoring.ReportService;
import com.aiinterview.backend.scoring.ScoringService;
import com.aiinterview.backend.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final QuestionAnswerRepository questionAnswerRepository;
    private final RoleRepository roleRepository;
    private final InterviewEngine interviewEngine;
    private final ScoringService scoringService;
    private final ReportService reportService;

    @Transactional
    public Interview createInterview(User user, InterviewController.CreateInterviewRequest request) {
        RoleEntity role = roleRepository.findById(request.roleId())
            .orElseThrow(() -> new IllegalArgumentException("Role not found"));

        checkPlanLimits(user, request.durationMinutes());

        Interview interview = Interview.builder()
            .user(user)
            .role(role)
            .customRole(request.customRole())
            .level(request.level())
            .type(request.type())
            .durationMinutes(request.durationMinutes())
            .cameraEnabled(request.cameraEnabled())
            .status(Interview.Status.SETUP)
            .planAtTime(user.getPlan().name())
            .build();

        return interviewRepository.save(interview);
    }

    public List<Interview> getUserInterviews(User user) {
        return interviewRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public Optional<Interview> getInterview(User user, Long id) {
        return interviewRepository.findByIdAndUser(id, user);
    }

    // FIX 2: LLM call is now OUTSIDE the @Transactional boundary.
    // DB state change (SETUP → IN_PROGRESS) commits first, then LLM is called.
    // If LLM fails, the interview is still IN_PROGRESS with a fallback question.
    public Interview startInterview(User user, Long id) {
        // Step 1: Transition status in its own transaction (commits immediately)
        Interview interview = startInterviewInTransaction(user, id);

        // Step 2: Generate first question via LLM — outside any transaction
        try {
            QuestionAnswer firstQ = interviewEngine.generateFirstQuestion(interview);
            saveQuestionInTransaction(firstQ);
            log.info("✓ First question saved for interview {}", interview.getId());
        } catch (Exception e) {
            log.warn("LLM failed for first question, saving fallback: {}", e.getMessage());
            QuestionAnswer fallback = interviewEngine.generateFallbackFirstQuestion(interview);
            saveQuestionInTransaction(fallback);
        }

        // Step 3: Return fresh interview with question loaded
        return getInterviewInTransaction(interview.getId(), user);
    }

    @Transactional
    protected Interview startInterviewInTransaction(User user, Long id) {
        Interview interview = interviewRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new IllegalArgumentException("Interview not found"));

        if (interview.getStatus() != Interview.Status.SETUP) {
            throw new IllegalStateException("Interview already started or completed");
        }

        interview.setStatus(Interview.Status.IN_PROGRESS);
        interview.setStartedAt(LocalDateTime.now());
        return interviewRepository.save(interview);
    }

    @Transactional
    protected QuestionAnswer saveQuestionInTransaction(QuestionAnswer question) {
        return questionAnswerRepository.save(question);
    }

    @Transactional(readOnly = true)
    protected Interview getInterviewInTransaction(Long id, User user) {
        return interviewRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new IllegalArgumentException("Interview not found"));
    }

    @Transactional
    public QuestionAnswer submitAnswer(User user, Long interviewId,
                                        InterviewController.SubmitAnswerRequest request) {
        Interview interview = interviewRepository.findByIdAndUser(interviewId, user)
            .orElseThrow(() -> new IllegalArgumentException("Interview not found"));

        QuestionAnswer qa = questionAnswerRepository.findById(request.questionAnswerId())
            .orElseThrow(() -> new IllegalArgumentException("Question not found"));

        if (!qa.getInterview().getId().equals(interviewId)) {
            throw new IllegalArgumentException("Question does not belong to this interview");
        }

        qa.setUserTranscript(request.transcript());
        qa.setVoiceMetrics(request.voiceMetrics());
        qa.setCameraMetrics(request.cameraMetrics());
        qa.setResponseTimeSeconds(request.responseTimeSeconds());
        qa.setSilenceDurationSeconds(request.silenceDurationSeconds());
        qa.setStatus(QuestionAnswer.Status.ANSWERED);

        // Score the answer — ScoringService handles all exceptions internally
        qa = scoringService.scoreAnswer(qa, interview);

        return questionAnswerRepository.save(qa);
    }

    // FIX 7: Removed @Transactional here — InterviewEngine.generateNextQuestion
    // uses Propagation.REQUIRES_NEW so it manages its own transaction.
    // Keeping @Transactional here caused nested transaction issues.
    public QuestionAnswer getNextQuestion(User user, Long interviewId) {
        Interview interview = interviewRepository.findByIdAndUser(interviewId, user)
            .orElseThrow(() -> new IllegalArgumentException("Interview not found"));

        return interviewEngine.generateNextQuestion(interview);
    }

    // FIX 5: Wrapped ReportService.generateReport in try-catch so a report
    // generation failure never rolls back the interview completion.
    // The interview WILL be marked COMPLETED even if the report fails.
    @Transactional
    public Interview completeInterview(User user, Long id) {
        Interview interview = interviewRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new IllegalArgumentException("Interview not found"));

        if (interview.getStatus() == Interview.Status.COMPLETED
                || interview.getStatus() == Interview.Status.PARTIAL) {
            throw new IllegalStateException("Interview already completed");
        }

        // Set completion metadata
        LocalDateTime now = LocalDateTime.now();
        interview.setCompletedAt(now);

        if (interview.getStartedAt() != null) {
            int durationSeconds = (int) java.time.Duration
                .between(interview.getStartedAt(), now).getSeconds();
            interview.setActualDurationSeconds(durationSeconds);
            // Mark as PARTIAL if completed in less than 15 minutes
            interview.setStatus(durationSeconds < 900
                ? Interview.Status.PARTIAL : Interview.Status.COMPLETED);
        } else {
            interview.setStatus(Interview.Status.COMPLETED);
        }

        interview.setIsPartial(interview.getStatus() == Interview.Status.PARTIAL);

        // FIX 5: Report generation is now guarded — failure saves empty report, not rollback
        try {
            Report report = reportService.generateReport(interview);
            interview.setReport(report);
            interview.setTotalScore(report.getTotalScore());
            log.info("✓ Report generated for interview {}, score={}", id, report.getTotalScore());
        } catch (Exception e) {
            log.error("✗ Report generation failed for interview {}: {} — completing anyway",
                    id, e.getMessage(), e);
            interview.setTotalScore(0);
        }

        return interviewRepository.save(interview);
    }

    @Transactional
    public void deleteInterview(User user, Long id) {
        Interview interview = interviewRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new IllegalArgumentException("Interview not found"));
        interviewRepository.delete(interview);
    }

    private void checkPlanLimits(User user, int durationMinutes) {
        if (user.getPlan() == User.Plan.FREE) {
            if (durationMinutes > 15) {
                throw new IllegalArgumentException(
                    "Free plan only allows up to 15 minutes");
            }
            LocalDateTime monthStart = LocalDateTime.now()
                .withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
            long count = interviewRepository.countByUserAndStatusInAndCreatedAtAfter(
                user, List.of(Interview.Status.COMPLETED, Interview.Status.PARTIAL), monthStart);
            if (count >= 1) {
                throw new IllegalArgumentException(
                    "Free plan allows only 1 interview per month");
            }
        }
    }
}