package com.aiinterview.backend.llm;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class NvidiaLlmClient implements LlmClient {
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${llm.nvidia.api-key:}")
    private String apiKey;

    @Value("${llm.nvidia.model:meta/llama-3.1-70b-instruct}")
    private String model;

    @Override
    public String generate(String prompt) {
        return generateWithSystemPrompt("You are an expert interviewer. Ask clear, relevant, professional interview questions.", prompt);
    }

    @Override
    public String generateWithSystemPrompt(String systemPrompt, String userPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("NVIDIA API key not configured");
        }

        String url = "https://integrate.api.nvidia.com/v1/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> request = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "temperature", 0.7,
                "max_tokens", 500,
                "top_p", 0.9
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            List<?> choices = (List<?>) response.getBody().get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map<?, ?> choice = (Map<?, ?>) choices.get(0);
                Map<?, ?> message = (Map<?, ?>) choice.get("message");
                return (String) message.get("content");
            }
            throw new RuntimeException("Unexpected response format from NVIDIA");
        } catch (Exception e) {
            log.error("NVIDIA API error: {}", e.getMessage());
            throw new RuntimeException("Failed to generate response from NVIDIA", e);
        }
    }
}