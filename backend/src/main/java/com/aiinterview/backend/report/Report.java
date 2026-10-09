package com.aiinterview.backend.report;

import com.aiinterview.backend.interview.Interview;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_id", nullable = false, unique = true)
    private Interview interview;

    @Column(name = "total_score", nullable = false)
    private Integer totalScore;

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

    @Column(name = "strengths", columnDefinition = "JSON")
    private String strengths;

    @Column(name = "improvements", columnDefinition = "JSON")
    private String improvements;

    @Column(name = "filler_word_counts", columnDefinition = "JSON")
    private String fillerWordCounts;

    @Column(name = "confidence_timeline", columnDefinition = "JSON")
    private String confidenceTimeline;

    @Column(name = "pace_timeline", columnDefinition = "JSON")
    private String paceTimeline;

    @Column(name = "camera_metrics", columnDefinition = "JSON")
    private String cameraMetrics;

    @Column(name = "comparison_with_previous", columnDefinition = "TEXT")
    private String comparisonWithPrevious;

    @Column(name = "llm_summary", columnDefinition = "TEXT")
    private String llmSummary;

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
}