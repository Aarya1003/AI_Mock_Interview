package com.aiinterview.backend.llm;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.Map;

// FIX 1: Removed @RequiredArgsConstructor — restTemplate is built in @PostConstruct,
// not injected, so Lombok's constructor would conflict. Using field injection via @Value instead.
@Component
@Slf4j
public class GeminiLlmClient implements LlmClient {

    @Value("${llm.gemini.api-key:}")
    private String apiKey;

    // FIX 10: Changed from gemini-2.5-flash (not on free tier) to gemini-1.5-flash
    @Value("${llm.gemini.model:gemini-1.5-flash}")
    private String model;

    private RestTemplate restTemplate;

    @PostConstruct
    public void init() {
        // FIX 1: Build RestTemplate with timeouts here, not in constructor
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory();
      
        this.restTemplate = new RestTemplate(factory);

        if (apiKey == null || apiKey.isBlank()) {
            log.error("═══════════════════════════════════════════════════");
            log.error("CRITICAL: GEMINI API KEY IS NOT CONFIGURED!");
            log.error("Add llm.gemini.api-key=YOUR_KEY to application.properties");
            log.error("Get a free key at: https://aistudio.google.com");
            log.error("═══════════════════════════════════════════════════");
        } else {
            log.info("✓ Gemini API initialized — model={}, keyLength={}", model, apiKey.length());
        }
    }

    @Override
    public String generate(String prompt) {
        return generateWithSystemPrompt(
            "You are an expert interviewer. Ask clear, relevant, professional interview questions.",
            prompt
        );
    }

    @Override
    public String generateWithSystemPrompt(String systemPrompt, String userPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Gemini API key not configured. Add llm.gemini.api-key to application.properties");
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":generateContent?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> request = Map.of(
            "contents", List.of(Map.of(
                "parts", List.of(Map.of("text", systemPrompt + "\n\n" + userPrompt))
            )),
            "generationConfig", Map.of(
                "temperature", 0.7,
                "maxOutputTokens", 500,
                "topP", 0.9
            )
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

        try {
            log.debug("Calling Gemini API — model={}, promptLength={}", model, userPrompt.length());
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            List<?> candidates = (List<?>) response.getBody().get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
                Map<?, ?> content = (Map<?, ?>) candidate.get("content");
                List<?> parts = (List<?>) content.get("parts");
                if (parts != null && !parts.isEmpty()) {
                    Map<?, ?> part = (Map<?, ?>) parts.get(0);
                    String result = (String) part.get("text");
                    log.debug("✓ Gemini response received — length={}", result.length());
                    return result.trim();
                }
            }
            throw new RuntimeException("Unexpected response format from Gemini API");
        } catch (Exception e) {
            log.error("✗ Gemini API error: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate response from Gemini: " + e.getMessage(), e);
        }
    }
}