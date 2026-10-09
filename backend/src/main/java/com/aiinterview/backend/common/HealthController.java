package com.aiinterview.backend.common;

import com.aiinterview.backend.llm.LlmClientFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// Test endpoints to verify LLM connectivity — remove or secure before production
@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final LlmClientFactory llmClientFactory;

    // Already permitted in SecurityConfig: .requestMatchers("/api/health").permitAll()
    @GetMapping
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "AI Interview System"));
    }

    // Test your Gemini key: GET http://localhost:8080/api/health/llm-test
    // Expected: {"status":"ok","response":"LLM is working"}
    // If you see {"status":"error"} your Gemini key is wrong or model is unavailable
    @GetMapping("/llm-test")
    public ResponseEntity<Map<String, String>> testLlm() {
        try {
            String response = llmClientFactory.getClient()
                .generate("Respond with exactly: 'LLM is working' and nothing else.");
            return ResponseEntity.ok(Map.of("status", "ok", "response", response.trim()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "status", "error",
                "message", e.getMessage(),
                "hint", "Check llm.gemini.api-key in application.properties"
            ));
        }
    }
}