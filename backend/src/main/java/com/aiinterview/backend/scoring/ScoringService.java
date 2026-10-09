package com.aiinterview.backend.scoring;

import com.aiinterview.backend.interview.Interview;
import com.aiinterview.backend.llm.LlmClientFactory;
import com.aiinterview.backend.question.QuestionAnswer;
import com.aiinterview.backend.question.QuestionAnswerRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScoringService {

    private final LlmClientFactory llmClientFactory;
    private final QuestionAnswerRepository questionAnswerRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public QuestionAnswer scoreAnswer(QuestionAnswer qa, Interview interview) {
        if (qa.getUserTranscript() == null || qa.getUserTranscript().trim().isEmpty()) {
            // FIX 6: setZeroScores no longer sets status — scoreAnswer sets it once below
            applyZeroScores(qa);
            qa.setStatus(QuestionAnswer.Status.SCORED);
            return questionAnswerRepository.save(qa);
        }

        try {
            ScoreResult result = callLlmForScoring(qa, interview);
            applyScores(qa, result);
            log.info("✓ Scored Q{} for interview {} — score={}",
                    qa.getQuestionIndex(), interview.getId(), qa.getTotalScore());
        } catch (Exception e) {
            log.error("✗ Failed to score Q{} for interview {}: {}",
                    qa.getQuestionIndex(), interview.getId(), e.getMessage(), e);
            // FIX 6: applyZeroScores does NOT set status here
            applyZeroScores(qa);
        }

        // FIX 6: Status set exactly ONCE here, after either path above
        qa.setStatus(QuestionAnswer.Status.SCORED);
        return questionAnswerRepository.save(qa);
    }

    private ScoreResult callLlmForScoring(QuestionAnswer qa, Interview interview) {
        String prompt = buildScoringPrompt(qa, interview);
        String systemPrompt = """
            You are an expert interview evaluator. Score the candidate's answer on 5 dimensions.
            Return ONLY valid JSON with this exact structure:
            {
              "correctnessDepth": <integer 0-40>,
              "structureClarity": <integer 0-15>,
              "confidenceTone": <integer 0-20>,
              "fluency": <integer 0-15>,
              "composure": <integer 0-10>,
              "feedback": "<2-3 sentences of specific feedback>",
              "strongAnswerPoints": "<what was done well, or empty string>",
              "llmReasoning": "<brief reasoning for scores>"
            }
            """;

        String response = llmClientFactory.getClient().generateWithSystemPrompt(systemPrompt, prompt);
        return parseScoreResponse(response);
    }

    private String buildScoringPrompt(QuestionAnswer qa, Interview interview) {
        String roleContext = interview.getCustomRole() != null
            ? interview.getCustomRole()
            : interview.getRole().getName();

        String levelContext = switch (interview.getLevel()) {
            case FRESHER -> "entry-level (0 years experience)";
            case ONE_TO_THREE_YEARS -> "junior to mid-level (1-3 years experience)";
            case THREE_PLUS_YEARS -> "senior-level (3+ years experience)";
        };

        String scoringGuidance = switch (interview.getType()) {
            case TECHNICAL ->
                "Focus on: technical accuracy, correctness of concepts, problem-solving depth, and practical knowledge.";
            case HR_BEHAVIOURAL ->
                "Focus on: use of STAR method, specificity of examples, emotional intelligence, self-awareness, and communication.";
            case MIXED ->
                "Balance technical accuracy (for technical questions) with communication and behavioral examples.";
        };

        String voiceMetricsInfo = "";
        if (qa.getVoiceMetrics() != null && !qa.getVoiceMetrics().isBlank()) {
            voiceMetricsInfo = "\nVoice Metrics (JSON): " + qa.getVoiceMetrics();
        }

        return String.format("""
            You are evaluating a %s interview answer for a %s role (%s).

            Scoring guidance: %s

            Question asked: %s

            Candidate's answer: %s%s

            Response time: %s seconds
            Is follow-up question: %s

            Score STRICTLY as integers within these ranges:
            - correctnessDepth: 0 to 40
            - structureClarity: 0 to 15
            - confidenceTone: 0 to 20
            - fluency: 0 to 15
            - composure: 0 to 10

            Scoring notes:
            - Very short answers (under 10 words): score 1-5 per dimension, not zero
            - Answers with good content but poor structure still get credit for correctness
            - For non-technical roles, correctnessDepth scores relevance and role-specific knowledge

            Return ONLY a valid JSON object with the exact keys shown.
            """,
            interview.getType().name().replace("_", " ").toLowerCase(),
            roleContext,
            levelContext,
            scoringGuidance,
            qa.getQuestionText(),
            qa.getUserTranscript(),
            voiceMetricsInfo,
            qa.getResponseTimeSeconds() != null ? qa.getResponseTimeSeconds() : "unknown",
            qa.getIsFollowUp()
        );
    }

    private ScoreResult parseScoreResponse(String response) {
        try {
            String jsonStr = extractJson(response);
            JsonNode node = objectMapper.readTree(jsonStr);

            return new ScoreResult(
                clamp(node.path("correctnessDepth").asInt(0), 0, 40),
                clamp(node.path("structureClarity").asInt(0), 0, 15),
                clamp(node.path("confidenceTone").asInt(0), 0, 20),
                clamp(node.path("fluency").asInt(0), 0, 15),
                clamp(node.path("composure").asInt(0), 0, 10),
                node.path("feedback").asText("No feedback available"),
                node.path("strongAnswerPoints").asText(""),
                node.path("llmReasoning").asText("")
            );
        } catch (Exception e) {
            log.warn("Failed to parse LLM score response: {} — raw: {}", e.getMessage(), response);
            return new ScoreResult(5, 3, 5, 3, 2,
                "Automated scoring encountered an issue. Please review manually.",
                "", "Parse error: " + e.getMessage());
        }
    }

    private String extractJson(String response) {
        int start = response.indexOf('{');
        int end = response.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return response.substring(start, end + 1);
        }
        return response;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private void applyScores(QuestionAnswer qa, ScoreResult result) {
        qa.setScoreCorrectnessDepth(result.correctnessDepth());
        qa.setScoreStructureClarity(result.structureClarity());
        qa.setScoreConfidenceTone(result.confidenceTone());
        qa.setScoreFluency(result.fluency());
        qa.setScoreComposure(result.composure());
        qa.setTotalScore(result.correctnessDepth() + result.structureClarity()
            + result.confidenceTone() + result.fluency() + result.composure());
        qa.setFeedback(result.feedback());
        qa.setStrongAnswerPoints(result.strongAnswerPoints());
        qa.setLlmReasoning(result.llmReasoning());
    }

    // FIX 6: Renamed setZeroScores → applyZeroScores and removed status assignment.
    // Status is now set exactly once in scoreAnswer() after this method returns.
    private void applyZeroScores(QuestionAnswer qa) {
        qa.setScoreCorrectnessDepth(0);
        qa.setScoreStructureClarity(0);
        qa.setScoreConfidenceTone(0);
        qa.setScoreFluency(0);
        qa.setScoreComposure(0);
        qa.setTotalScore(0);
        qa.setFeedback("No answer was provided for this question.");
        qa.setStrongAnswerPoints("");
        qa.setLlmReasoning("Empty transcript — zero scores applied automatically.");
    }

    public record ScoreResult(
        int correctnessDepth,
        int structureClarity,
        int confidenceTone,
        int fluency,
        int composure,
        String feedback,
        String strongAnswerPoints,
        String llmReasoning
    ) {}
}