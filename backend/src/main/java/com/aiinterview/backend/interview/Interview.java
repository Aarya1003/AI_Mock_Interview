package com.aiinterview.backend.interview;

import com.aiinterview.backend.question.QuestionAnswer;
import com.aiinterview.backend.report.Report;
import com.aiinterview.backend.role.RoleEntity;
import com.aiinterview.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "interviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Interview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private RoleEntity role;

    @Column(name = "custom_role", length = 200)
    private String customRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExperienceLevel level;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterviewType type;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(name = "camera_enabled", nullable = false)
    @Builder.Default
    private Boolean cameraEnabled = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.SETUP;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "actual_duration_seconds")
    private Integer actualDurationSeconds;

    @Column(name = "total_score")
    private Integer totalScore;

    @Column(name = "is_partial", nullable = false)
    @Builder.Default
    private Boolean isPartial = false;

    @Column(name = "plan_at_time", length = 20)
    private String planAtTime;

    @OneToMany(mappedBy = "interview", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<QuestionAnswer> questionAnswers = new ArrayList<>();

    @OneToMany(mappedBy = "interview", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Interruption> interruptions = new ArrayList<>();

    @OneToOne(mappedBy = "interview", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Report report;

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

    public enum ExperienceLevel {
        FRESHER, ONE_TO_THREE_YEARS, THREE_PLUS_YEARS
    }

    public enum InterviewType {
        TECHNICAL, HR_BEHAVIOURAL, MIXED
    }

    public enum Status {
        SETUP, IN_PROGRESS, COMPLETED, PARTIAL, ABANDONED
    }
}