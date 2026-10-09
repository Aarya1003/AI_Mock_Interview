package com.aiinterview.backend.interview;

import com.aiinterview.backend.auth.CurrentUserArgumentResolver;
import com.aiinterview.backend.question.QuestionAnswer;
import com.aiinterview.backend.report.Report;
import com.aiinterview.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/interviews")
@RequiredArgsConstructor
public class InterviewController {
    private final InterviewService interviewService;

    @PostMapping
    public ResponseEntity<?> createInterview(@AuthenticationPrincipal User user, @Valid @RequestBody CreateInterviewRequest request) {
        Interview interview = interviewService.createInterview(user, request);
        return ResponseEntity.ok(toResponse(interview));
    }

    @GetMapping
    public ResponseEntity<?> getInterviews(@AuthenticationPrincipal User user) {
        List<Interview> interviews = interviewService.getUserInterviews(user);
        return ResponseEntity.ok(interviews.stream().map(this::toListResponse).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getInterview(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return interviewService.getInterview(user, id)
                .map(this::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<?> startInterview(@AuthenticationPrincipal User user, @PathVariable Long id) {
        Interview interview = interviewService.startInterview(user, id);
        return ResponseEntity.ok(toResponse(interview));
    }

    @PostMapping("/{id}/answer")
    public ResponseEntity<?> submitAnswer(@AuthenticationPrincipal User user, @PathVariable Long id, @Valid @RequestBody SubmitAnswerRequest request) {
        QuestionAnswer qa = interviewService.submitAnswer(user, id, request);
        return ResponseEntity.ok(toQAResponse(qa));
    }

    @PostMapping("/{id}/next-question")
    public ResponseEntity<?> getNextQuestion(@AuthenticationPrincipal User user, @PathVariable Long id) {
        QuestionAnswer qa = interviewService.getNextQuestion(user, id);
        return ResponseEntity.ok(toQAResponse(qa));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<?> completeInterview(@AuthenticationPrincipal User user, @PathVariable Long id) {
        Interview interview = interviewService.completeInterview(user, id);
        return ResponseEntity.ok(toResponse(interview));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteInterview(@AuthenticationPrincipal User user, @PathVariable Long id) {
        interviewService.deleteInterview(user, id);
        return ResponseEntity.ok(Map.of("message", "Interview deleted"));
    }

    private InterviewResponse toResponse(Interview interview) {
        // Access role name while still in transaction/session
        String roleName = interview.getRole() != null ? interview.getRole().getName() : "Unknown";
        return new InterviewResponse(
                interview.getId(),
                roleName,
                interview.getCustomRole(),
                interview.getLevel().name(),
                interview.getType().name(),
                interview.getDurationMinutes(),
                interview.getCameraEnabled(),
                interview.getStatus().name(),
                interview.getStartedAt(),
                interview.getCompletedAt(),
                interview.getActualDurationSeconds(),
                interview.getTotalScore(),
                interview.getIsPartial(),
                interview.getPlanAtTime(),
                interview.getQuestionAnswers().stream().map(this::toQAResponse).toList(),
                interview.getReport() != null ? toReportResponse(interview.getReport()) : null,
                interview.getCreatedAt()
        );
    }

    private InterviewListResponse toListResponse(Interview interview) {
        String roleName = interview.getRole() != null ? interview.getRole().getName() : "Unknown";
        return new InterviewListResponse(
                interview.getId(),
                roleName,
                interview.getCustomRole(),
                interview.getLevel().name(),
                interview.getType().name(),
                interview.getDurationMinutes(),
                interview.getStatus().name(),
                interview.getTotalScore(),
                interview.getIsPartial(),
                interview.getCreatedAt(),
                interview.getCompletedAt()
        );
    }

    private QuestionAnswerResponse toQAResponse(QuestionAnswer qa) {
        return new QuestionAnswerResponse(
                qa.getId(),
                qa.getQuestionIndex(),
                qa.getQuestionText(),
                qa.getUserTranscript(),
                qa.getVoiceMetrics(),
                qa.getCameraMetrics(),
                qa.getResponseTimeSeconds(),
                qa.getIsFollowUp(),
                qa.getStatus().name(),
                qa.getTotalScore(),
                qa.getFeedback(),
                qa.getStrongAnswerPoints(),
                qa.getScoreCorrectnessDepth(),
                qa.getScoreStructureClarity(),
                qa.getScoreConfidenceTone(),
                qa.getScoreFluency(),
                qa.getScoreComposure()
        );
    }

    private ReportResponse toReportResponse(Report report) {
        return new ReportResponse(
                report.getTotalScore(),
                report.getScoreCorrectnessDepth(),
                report.getScoreStructureClarity(),
                report.getScoreConfidenceTone(),
                report.getScoreFluency(),
                report.getScoreComposure(),
                report.getStrengths(),
                report.getImprovements(),
                report.getFillerWordCounts(),
                report.getConfidenceTimeline(),
                report.getPaceTimeline(),
                report.getCameraMetrics(),
                report.getComparisonWithPrevious(),
                report.getLlmSummary()
        );
    }

    public record CreateInterviewRequest(
            @jakarta.validation.constraints.NotNull Long roleId,
            String customRole,
            @jakarta.validation.constraints.NotNull Interview.ExperienceLevel level,
            @jakarta.validation.constraints.NotNull Interview.InterviewType type,
            @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Min(15) @jakarta.validation.constraints.Max(45) Integer durationMinutes,
            @jakarta.validation.constraints.NotNull Boolean cameraEnabled
    ) {}

    public record SubmitAnswerRequest(
            @jakarta.validation.constraints.NotNull Long questionAnswerId,
            @jakarta.validation.constraints.NotBlank String transcript,
            String voiceMetrics,
            String cameraMetrics,
            Integer responseTimeSeconds,
            Integer silenceDurationSeconds
    ) {}

    public record InterviewResponse(
            Long id,
            String roleName,
            String customRole,
            String level,
            String type,
            Integer durationMinutes,
            Boolean cameraEnabled,
            String status,
            java.time.LocalDateTime startedAt,
            java.time.LocalDateTime completedAt,
            Integer actualDurationSeconds,
            Integer totalScore,
            Boolean isPartial,
            String planAtTime,
            List<QuestionAnswerResponse> questionAnswers,
            ReportResponse report,
            java.time.LocalDateTime createdAt
    ) {}

    public record InterviewListResponse(
            Long id,
            String roleName,
            String customRole,
            String level,
            String type,
            Integer durationMinutes,
            String status,
            Integer totalScore,
            Boolean isPartial,
            java.time.LocalDateTime createdAt,
            java.time.LocalDateTime completedAt
    ) {}

    public record QuestionAnswerResponse(
            Long id,
            Integer questionIndex,
            String questionText,
            String userTranscript,
            String voiceMetrics,
            String cameraMetrics,
            Integer responseTimeSeconds,
            Boolean isFollowUp,
            String status,
            Integer totalScore,
            String feedback,
            String strongAnswerPoints,
            Integer scoreCorrectnessDepth,
            Integer scoreStructureClarity,
            Integer scoreConfidenceTone,
            Integer scoreFluency,
            Integer scoreComposure
    ) {}

    public record ReportResponse(
            Integer totalScore,
            Integer scoreCorrectnessDepth,
            Integer scoreStructureClarity,
            Integer scoreConfidenceTone,
            Integer scoreFluency,
            Integer scoreComposure,
            String strengths,
            String improvements,
            String fillerWordCounts,
            String confidenceTimeline,
            String paceTimeline,
            String cameraMetrics,
            String comparisonWithPrevious,
            String llmSummary
    ) {}
}