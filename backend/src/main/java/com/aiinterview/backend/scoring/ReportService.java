package com.aiinterview.backend.scoring;

import com.aiinterview.backend.interview.Interview;
import com.aiinterview.backend.interview.InterviewRepository;
import com.aiinterview.backend.llm.LlmClientFactory;
import com.aiinterview.backend.question.QuestionAnswer;
import com.aiinterview.backend.question.QuestionAnswerRepository;
import com.aiinterview.backend.report.Report;
import com.aiinterview.backend.report.ReportRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final LlmClientFactory llmClientFactory;
    private final QuestionAnswerRepository questionAnswerRepository;
    private final ReportRepository reportRepository;
    private final InterviewRepository interviewRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public Report generateReport(Interview interview) {
        List<QuestionAnswer> answeredQuestions = questionAnswerRepository
            .findByInterviewOrderByQuestionIndexAsc(interview)
            .stream()
            .filter(q -> q.getStatus() == QuestionAnswer.Status.ANSWERED
                      || q.getStatus() == QuestionAnswer.Status.SCORED)
            .toList();

        if (answeredQuestions.isEmpty()) {
            return createEmptyReport(interview);
        }

        // Calculate scores (this never throws)
        int avgCorrectnessDepth = safeAvg(answeredQuestions, QuestionAnswer::getScoreCorrectnessDepth, 40);
        int avgStructureClarity = safeAvg(answeredQuestions, QuestionAnswer::getScoreStructureClarity, 15);
        int avgConfidenceTone = safeAvg(answeredQuestions, QuestionAnswer::getScoreConfidenceTone, 20);
        int avgFluency = safeAvg(answeredQuestions, QuestionAnswer::getScoreFluency, 15);
        int avgComposure = safeAvg(answeredQuestions, QuestionAnswer::getScoreComposure, 10);
        int totalScore = avgCorrectnessDepth + avgStructureClarity + avgConfidenceTone + avgFluency + avgComposure;

        // Generate timeline and metrics (no LLM calls)
        String confidenceTimeline = safeGenerate(() -> generateConfidenceTimeline(answeredQuestions), "[]");
        String paceTimeline = safeGenerate(() -> generatePaceTimeline(answeredQuestions), "[]");
        String fillerWordCounts = safeGenerate(() -> extractFillerWords(answeredQuestions), "{}");
        String cameraMetrics = safeGenerate(() -> generateCameraMetrics(answeredQuestions), "{}");
        String comparison = safeGenerate(() -> generateComparison(interview, totalScore), "First interview");

        // LLM insights — graceful fallback (OUTSIDE transaction would be better, but this is the final step)
        ReportInsights insights;
        try {
            insights = generateInsights(interview, answeredQuestions);
        } catch (Exception e) {
            log.error("LLM insights failed, using fallback: {}", e.getMessage());
            insights = new ReportInsights(
                List.of("Completed the interview", "Attempted all questions", "Showed engagement"),
                List.of("Practice more specific examples", "Improve technical depth", "Reduce filler words"),
                "Interview completed successfully. Score: " + totalScore + "/100."
            );
        }

        Report report = Report.builder()
            .interview(interview)
            .totalScore(totalScore)
            .scoreCorrectnessDepth(avgCorrectnessDepth)
            .scoreStructureClarity(avgStructureClarity)
            .scoreConfidenceTone(avgConfidenceTone)
            .scoreFluency(avgFluency)
            .scoreComposure(avgComposure)
            .strengths(toJson(insights.strengths()))
            .improvements(toJson(insights.improvements()))
            .fillerWordCounts(fillerWordCounts)
            .confidenceTimeline(confidenceTimeline)
            .paceTimeline(paceTimeline)
            .cameraMetrics(cameraMetrics)
            .comparisonWithPrevious(comparison)
            .llmSummary(insights.summary())
            .build();

        return reportRepository.save(report);
    }

    private String safeGenerate(java.util.function.Supplier<String> fn, String fallback) {
        try { return fn.get(); } catch (Exception e) { return fallback; }
    }

    private int safeAvg(List<QuestionAnswer> questions,
                        java.util.function.Function<QuestionAnswer, Integer> getter,
                        int max) {
        return (int) Math.round(questions.stream()
            .mapToInt(q -> { Integer v = getter.apply(q); return v != null ? v : 0; })
            .average().orElse(0));
    }

    private Report createEmptyReport(Interview interview) {
        Report report = Report.builder()
                .interview(interview)
                .totalScore(0)
                .scoreCorrectnessDepth(0)
                .scoreStructureClarity(0)
                .scoreConfidenceTone(0)
                .scoreFluency(0)
                .scoreComposure(0)
                .strengths("[]")
                .improvements("[]")
                .fillerWordCounts("{}")
                .confidenceTimeline("[]")
                .paceTimeline("[]")
                .comparisonWithPrevious("No previous interviews to compare")
                .llmSummary("No answers were provided during the interview.")
                .build();
        return reportRepository.save(report);
    }

    private String generateConfidenceTimeline(List<QuestionAnswer> questions) {
        try {
            ArrayNode timeline = objectMapper.createArrayNode();
            for (QuestionAnswer qa : questions) {
                ObjectNode point = objectMapper.createObjectNode();
                point.put("questionIndex", qa.getQuestionIndex());
                point.put("score", qa.getScoreConfidenceTone() != null ? qa.getScoreConfidenceTone() : 0);
                point.put("isFollowUp", qa.getIsFollowUp());
                timeline.add(point);
            }
            return objectMapper.writeValueAsString(timeline);
        } catch (Exception e) {
            log.warn("Failed to generate confidence timeline: {}", e.getMessage());
            return "[]";
        }
    }

    private String generatePaceTimeline(List<QuestionAnswer> questions) {
        try {
            ArrayNode timeline = objectMapper.createArrayNode();
            for (QuestionAnswer qa : questions) {
                ObjectNode point = objectMapper.createObjectNode();
                point.put("questionIndex", qa.getQuestionIndex());
                int wpm = calculateWpm(qa);
                point.put("wpm", wpm);
                point.put("isFollowUp", qa.getIsFollowUp());
                timeline.add(point);
            }
            return objectMapper.writeValueAsString(timeline);
        } catch (Exception e) {
            log.warn("Failed to generate pace timeline: {}", e.getMessage());
            return "[]";
        }
    }

    private int calculateWpm(QuestionAnswer qa) {
        if (qa.getUserTranscript() == null || qa.getResponseTimeSeconds() == null || qa.getResponseTimeSeconds() == 0) {
            return 0;
        }
        int wordCount = qa.getUserTranscript().trim().split("\\s+").length;
        double minutes = qa.getResponseTimeSeconds() / 60.0;
        return minutes > 0 ? (int) Math.round(wordCount / minutes) : 0;
    }

    private String extractFillerWords(List<QuestionAnswer> questions) {
        Map<String, Integer> fillerCounts = new HashMap<>();
        String[] fillerWords = {
                "um", "uh", "like", "basically", "actually", "matlab", "you know",
                "i mean", "sort of", "kind of", "so", "well", "er", "ah", "hmm"
        };

        for (QuestionAnswer qa : questions) {
            if (qa.getUserTranscript() == null) continue;
            String transcript = qa.getUserTranscript().toLowerCase();
            for (String filler : fillerWords) {
                int count = countOccurrences(transcript, filler);
                if (count > 0) {
                    fillerCounts.merge(filler, count, Integer::sum);
                }
            }
        }

        try {
            return objectMapper.writeValueAsString(fillerCounts);
        } catch (Exception e) {
            return "{}";
        }
    }

    private int countOccurrences(String text, String word) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(word, index)) != -1) {
            boolean wordBoundaryBefore = index == 0 || !Character.isLetter(text.charAt(index - 1));
            boolean wordBoundaryAfter = index + word.length() >= text.length() || !Character.isLetter(text.charAt(index + word.length()));
            if (wordBoundaryBefore && wordBoundaryAfter) {
                count++;
            }
            index += word.length();
        }
        return count;
    }

    private String generateCameraMetrics(List<QuestionAnswer> questions) {
        try {
            List<Map<String, Object>> allMetrics = new ArrayList<>();
            int totalFrames = 0;
            int faceDetectedFrames = 0;
            int lookingAwayFrames = 0;

            for (QuestionAnswer qa : questions) {
                if (qa.getCameraMetrics() != null && !qa.getCameraMetrics().isBlank()) {
                    try {
                        JsonNode metricsNode = objectMapper.readTree(qa.getCameraMetrics());
                        if (metricsNode.isObject()) {
                            Map<String, Object> metric = objectMapper.convertValue(metricsNode, Map.class);
                            metric.put("questionIndex", qa.getQuestionIndex());
                            allMetrics.add(metric);

                            totalFrames += (Integer) metric.getOrDefault("totalFrames", 0);
                            faceDetectedFrames += (Integer) metric.getOrDefault("faceDetectedFrames", 0);
                            lookingAwayFrames += (Integer) metric.getOrDefault("lookingAwayFrames", 0);
                        }
                    } catch (Exception e) {
                        log.warn("Failed to parse camera metrics for question {}: {}", qa.getId(), e.getMessage());
                    }
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("perQuestion", allMetrics);
            result.put("summary", Map.of(
                    "totalFrames", totalFrames,
                    "faceDetectedFrames", faceDetectedFrames,
                    "lookingAwayFrames", lookingAwayFrames,
                    "faceDetectionRate", totalFrames > 0 ? (double) faceDetectedFrames / totalFrames : 0,
                    "lookingAwayRate", totalFrames > 0 ? (double) lookingAwayFrames / totalFrames : 0
            ));

            return objectMapper.writeValueAsString(result);
        } catch (Exception e) {
            log.warn("Failed to generate camera metrics: {}", e.getMessage());
            return "{}";
        }
    }

    private ReportInsights generateInsights(Interview interview, List<QuestionAnswer> questions) {
        try {
            String prompt = buildInsightsPrompt(interview, questions);
            String systemPrompt = "You are an expert interview coach. Analyze the candidate's performance and provide actionable feedback. Return ONLY valid JSON with exact keys: strengths (array of 3 strings), improvements (array of 3 strings), summary (string).";

            String response = llmClientFactory.getClient().generateWithSystemPrompt(systemPrompt, prompt);
            return parseInsightsResponse(response);
        } catch (Exception e) {
            log.warn("Failed to generate insights: {}", e.getMessage());
            return new ReportInsights(
                    List.of("Completed the interview", "Attempted all questions", "Showed willingness to engage"),
                    List.of("Provide more specific examples", "Improve technical depth", "Work on communication structure"),
                    "The candidate completed the interview. More detailed feedback requires a longer session with substantive answers."
            );
        }
    }

    private String buildInsightsPrompt(Interview interview, List<QuestionAnswer> questions) {
        String qaText = questions.stream()
                .map(q -> String.format("Q%d: %s\nA: %s\nScores: C:%d S:%d CT:%d F:%d Co:%d\nFeedback: %s",
                        q.getQuestionIndex() + 1,
                        q.getQuestionText(),
                        q.getUserTranscript() != null ? q.getUserTranscript() : "No answer",
                        q.getScoreCorrectnessDepth() != null ? q.getScoreCorrectnessDepth() : 0,
                        q.getScoreStructureClarity() != null ? q.getScoreStructureClarity() : 0,
                        q.getScoreConfidenceTone() != null ? q.getScoreConfidenceTone() : 0,
                        q.getScoreFluency() != null ? q.getScoreFluency() : 0,
                        q.getScoreComposure() != null ? q.getScoreComposure() : 0,
                        q.getFeedback() != null ? q.getFeedback() : "N/A"))
                .collect(Collectors.joining("\n\n"));

        String roleContext = interview.getCustomRole() != null ? interview.getCustomRole() : interview.getRole().getName();

        return String.format("""
                Interview for %s role (%s, %s).

                Questions and Answers:
                %s

                Identify exactly 3 strengths and 3 areas for improvement. Be specific and actionable.
                Provide a 2-3 paragraph summary of overall performance.
                Return ONLY valid JSON.
                """,
                roleContext, interview.getLevel(), interview.getType(), qaText);
    }

    private ReportInsights parseInsightsResponse(String response) {
        try {
            String jsonStr = extractJson(response);
            JsonNode node = objectMapper.readTree(jsonStr);

            List<String> strengths = new ArrayList<>();
            if (node.has("strengths") && node.get("strengths").isArray()) {
                node.get("strengths").forEach(n -> strengths.add(n.asText()));
            }

            List<String> improvements = new ArrayList<>();
            if (node.has("improvements") && node.get("improvements").isArray()) {
                node.get("improvements").forEach(n -> improvements.add(n.asText()));
            }

            String summary = node.has("summary") ? node.get("summary").asText() : "";

            return new ReportInsights(strengths, improvements, summary);
        } catch (Exception e) {
            log.warn("Failed to parse insights response: {}", e.getMessage());
            return new ReportInsights(
                    List.of("Completed interview", "Answered questions", "Engaged in process"),
                    List.of("Add more detail", "Improve structure", "Reduce filler words"),
                    "Automated analysis completed. Manual review recommended for detailed feedback."
            );
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

    private String generateComparison(Interview currentInterview, int currentScore) {
        try {
            List<Interview> previousInterviews = interviewRepository.findPreviousCompletedInterviews(
                    currentInterview.getUser(), currentInterview.getId(),
                    List.of(Interview.Status.COMPLETED, Interview.Status.PARTIAL));

            if (previousInterviews.isEmpty()) {
                return "This is your first interview. No comparison available.";
            }

            double avgPreviousScore = previousInterviews.stream()
                    .mapToInt(i -> i.getTotalScore() != null ? i.getTotalScore() : 0)
                    .average()
                    .orElse(0);

            int diff = currentScore - (int) Math.round(avgPreviousScore);
            String trend = diff > 0 ? "improved" : diff < 0 ? "declined" : "stayed similar";

            return String.format(
                    "Compared to your %d previous interview(s) (avg score: %.0f/100), your score has %s by %d points.",
                    previousInterviews.size(), avgPreviousScore, trend, Math.abs(diff)
            );
        } catch (Exception e) {
            log.warn("Failed to generate comparison: {}", e.getMessage());
            return "Comparison unavailable.";
        }
    }

    private String toJson(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }

    public record ReportInsights(
            List<String> strengths,
            List<String> improvements,
            String summary
    ) {}
}