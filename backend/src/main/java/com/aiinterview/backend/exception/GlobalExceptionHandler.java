package com.aiinterview.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

// FIX 8: Global exception handler so all errors return user-friendly JSON messages
// instead of Spring's default 500 stack trace or the security filter's 403.
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        String raw = ex.getMessage();
        String userMessage = mapToUserMessage(raw);
        String code = getErrorCode(raw);

        log.warn("IllegalArgumentException [{}]: {}", code, raw);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
            "error", userMessage,
            "code", code,
            "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        log.warn("IllegalStateException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
            "error", ex.getMessage(),
            "code", "CONFLICT",
            "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .findFirst()
            .orElse("Validation failed");

        log.warn("Validation error: {}", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
            "error", message,
            "code", "VALIDATION_ERROR",
            "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
            "error", "Something went wrong on our end. Please try again.",
            "code", "SERVER_ERROR",
            "timestamp", LocalDateTime.now().toString()
        ));
    }

    private String mapToUserMessage(String raw) {
        if (raw == null) return "An unexpected error occurred.";
        if (raw.contains("Free plan allows only 1 interview per month")) {
            return "Your free trial limit has been reached. You've used your 1 free interview " +
                   "this month. Upgrade to Pro for unlimited interviews, longer sessions, " +
                   "and detailed AI performance reports.";
        }
        if (raw.contains("Free plan only allows up to 15 minutes")) {
            return "Free plan sessions are limited to 15 minutes. " +
                   "Upgrade to Pro to unlock 30 and 45-minute deep-dive interviews.";
        }
        if (raw.contains("Role not found")) {
            return "The selected role could not be found. Please select a different role and try again.";
        }
        if (raw.contains("Interview not found")) {
            return "This interview session could not be found. It may have been deleted.";
        }
        if (raw.contains("Question not found")) {
            return "The question could not be found. Please refresh the page and try again.";
        }
        if (raw.contains("already started")) {
            return "This interview has already been started.";
        }
        if (raw.contains("already completed")) {
            return "This interview has already been completed.";
        }
        if (raw.contains("does not belong")) {
            return "Invalid request — question does not belong to this interview.";
        }
        if (raw.contains("Gemini API key")) {
            return "AI service is temporarily unavailable. Please try again in a moment.";
        }
        return raw; // Return as-is for other validation messages
    }

    private String getErrorCode(String raw) {
        if (raw == null) return "UNKNOWN";
        if (raw.contains("Free plan")) return "PLAN_LIMIT_REACHED";
        if (raw.contains("Role not found")) return "ROLE_NOT_FOUND";
        if (raw.contains("Interview not found") || raw.contains("Question not found")) return "NOT_FOUND";
        if (raw.contains("already")) return "ALREADY_EXISTS";
        if (raw.contains("does not belong")) return "FORBIDDEN";
        return "VALIDATION_ERROR";
    }
}