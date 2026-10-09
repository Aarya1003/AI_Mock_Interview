package com.aiinterview.backend.llm;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LlmClientFactory {
    private final GeminiLlmClient geminiClient;
    private final NvidiaLlmClient nvidiaClient;

    @Value("${llm.provider:gemini}")
    private String provider;

    public LlmClient getClient() {
        String p = provider.toLowerCase();
        if ("nvidia".equals(p)) {
            return nvidiaClient;
        }
        return geminiClient;
    }
}