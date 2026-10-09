package com.aiinterview.backend.llm;

public interface LlmClient {
    String generate(String prompt);
    String generateWithSystemPrompt(String systemPrompt, String userPrompt);
}