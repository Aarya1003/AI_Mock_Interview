package com.aiinterview.backend.question;

import com.aiinterview.backend.interview.Interview;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "question_answers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_id", nullable = false)
    private Interview interview;

    @Column(name = "question_index", nullable = false)
    private Integer questionIndex;

    @Column(name = "question_text", columnDefinition = "TEXT", nullable = false)
    private String questionText;

    @Column(name = "expected_topics", columnDefinition = "TEXT")
    private String expectedTopics;

    @Column(name = "rubric", columnDefinition = "TEXT")
    private String rubric;

    @Column(name = "user_transcript", columnDefinition = "TEXT")
    private String userTranscript;

    @Column(name = "voice_metrics", columnDefinition = "JSON")
    private String voiceMetrics;

    @Column(name = "camera_metrics", columnDefinition = "JSON")
    private String cameraMetrics;

    @Column(name = "response_time_seconds")
    private Integer responseTimeSeconds;

    @Column(name = "silence_duration_seconds")
    private Integer silenceDurationSeconds;

    @Column(name = "is_follow_up", nullable = false)
    @Builder.Default
    private Boolean isFollowUp = false;

    @Column(name = "parent_question_id")
    private Long parentQuestionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "score_correctness_depth")
    private Integer scoreCorrectnessDepth;

    @Column(name = "score_structure_clarity")
    private Integer scoreStructureClarity;

    @Column(name = "score_confidence_tone")
    private Integer scoreConfidenceTone;

    @Column(name = "score_fluency")
    private Integer scoreFluency;

    @Column(name = "score_composure")
    private Integer scoreComposure;

    @Column(name = "total_score")
    private Integer totalScore;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "strong_answer_points", columnDefinition = "TEXT")
    private String strongAnswerPoints;

    @Column(name = "llm_reasoning", columnDefinition = "TEXT")
    private String llmReasoning;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum Status {
        PENDING, ASKED, ANSWERED, SCORED
    }
}