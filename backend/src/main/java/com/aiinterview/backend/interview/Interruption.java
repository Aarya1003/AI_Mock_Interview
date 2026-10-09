package com.aiinterview.backend.interview;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "interruptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Interruption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_id", nullable = false)
    private Interview interview;

    @Column(name = "question_answer_id")
    private Long questionAnswerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(name = "trigger_details", columnDefinition = "TEXT")
    private String triggerDetails;

    @Column(name = "ai_response", columnDefinition = "TEXT")
    private String aiResponse;

    @Column(name = "user_reaction", columnDefinition = "TEXT")
    private String userReaction;

    @Column(name = "timestamp_seconds", nullable = false)
    private Integer timestampSeconds;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum Type {
        USER_OVER_AI,
        AI_INTERJECT_RAMBLING,
        AI_INTERJECT_OFF_TOPIC,
        AI_PROMPT_SILENCE
    }
}