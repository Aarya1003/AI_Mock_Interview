package com.aiinterview.backend.interview;

import com.aiinterview.backend.llm.LlmClientFactory;
import com.aiinterview.backend.question.QuestionAnswer;
import com.aiinterview.backend.question.QuestionAnswerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class InterviewEngine {

    private final LlmClientFactory llmClientFactory;
    private final QuestionAnswerRepository questionAnswerRepository;
    private final InterviewRepository interviewRepository;
    private final Random random = new Random();

    // FIX 2 + 3: generateFirstQuestion now calls LLM for a personalized opening question
    // instead of using the hardcoded warmup string
    public QuestionAnswer generateFirstQuestion(Interview interview) {
        String roleContext = interview.getCustomRole() != null
                ? interview.getCustomRole()
                : interview.getRole().getName();

        String levelContext = switch (interview.getLevel()) {
            case FRESHER -> "a fresher with 0 years of experience";
            case ONE_TO_THREE_YEARS -> "someone with 1-3 years of experience";
            case THREE_PLUS_YEARS -> "a senior professional with 3+ years of experience";
        };

        String prompt = String.format(
            "You are interviewing a candidate for a %s role. The candidate is %s. " +
            "Generate a warm, professional opening question that asks them to introduce " +
            "themselves and explain why they are interested in this %s position. " +
            "Make it welcoming but evaluative. Sound like a real interviewer. " +
            "Return ONLY the question text, no preamble.",
            roleContext, levelContext, roleContext
        );

        try {
            String questionText = llmClientFactory.getClient().generate(prompt);
            log.info("✓ LLM generated first question for role: {}", roleContext);
            return createQuestion(interview, 0, questionText.trim(), false, null);
        } catch (Exception e) {
            log.error("✗ LLM failed for first question (role: {}): {} — using fallback",
                    roleContext, e.getMessage());
            // Rethrow so InterviewService can save the fallback
            throw e;
        }
    }

    public QuestionAnswer generateFallbackFirstQuestion(Interview interview) {
        String roleContext = interview.getCustomRole() != null
                ? interview.getCustomRole()
                : interview.getRole().getName();
        String question = String.format(
            "Welcome to your %s interview! Let's start with a quick introduction. " +
            "Tell me about yourself, your background, and what specifically attracts " +
            "you to this %s role.",
            roleContext, roleContext
        );
        log.info("Using fallback first question for interview {}", interview.getId());
        return createQuestion(interview, 0, question, false, null);
    }

    // FIX 7: Changed @Transactional to REQUIRES_NEW so it doesn't inherit the caller's
    // transaction from InterviewService.getNextQuestion — avoids nested transaction issues
    // and ensures the new question is saved independently.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public QuestionAnswer generateNextQuestion(Interview interview) {
        // Re-fetch to ensure all lazy relationships are loaded in this transaction
        interview = interviewRepository.findById(interview.getId())
            .orElseThrow(() -> new IllegalArgumentException("Interview not found"));

        List<QuestionAnswer> existing = questionAnswerRepository
            .findByInterviewOrderByQuestionIndexAsc(interview);
        int nextIndex = existing.size();

        if (shouldWrapUp(interview, existing)) {
            String wrapupQuestion = "Thank you for your time. Do you have any final questions for me about the role or the company?";
            QuestionAnswer wrapup = createQuestion(interview, nextIndex, wrapupQuestion, false, null);
            return questionAnswerRepository.save(wrapup);
        }

        QuestionAnswer lastAnswered = existing.stream()
            .filter(q -> q.getStatus() == QuestionAnswer.Status.ANSWERED
                      || q.getStatus() == QuestionAnswer.Status.SCORED)
            .reduce((first, second) -> second)
            .orElse(null);

        if (lastAnswered != null && shouldGenerateFollowUp(lastAnswered)) {
            String followUp = generateFollowUpQuestion(interview, lastAnswered);
            QuestionAnswer qa = createQuestion(interview, nextIndex, followUp, true, lastAnswered.getId());
            return questionAnswerRepository.save(qa);
        }

        String question = generateCoreQuestion(interview, nextIndex, existing);
        QuestionAnswer qa = createQuestion(interview, nextIndex, question, false, null);
        return questionAnswerRepository.save(qa);
    }

    private boolean shouldWrapUp(Interview interview, List<QuestionAnswer> questions) {
        if (interview.getDurationMinutes() >= 45 && questions.size() >= 9) return true;
        int maxQuestions = calculateQuestionCount(interview.getDurationMinutes()) + 2;
        return questions.size() >= maxQuestions;
    }

    private boolean shouldGenerateFollowUp(QuestionAnswer lastAnswered) {
        return lastAnswered.getUserTranscript() != null
            && !lastAnswered.getUserTranscript().trim().isEmpty()
            && lastAnswered.getUserTranscript().trim().split("\\s+").length > 20
            && random.nextDouble() < 0.35;
    }

    private int calculateQuestionCount(int durationMinutes) {
        return Math.max(3, durationMinutes / 5);
    }

    private String generateCoreQuestion(Interview interview, int index,
                                         List<QuestionAnswer> previousQuestions) {
        String roleContext = interview.getCustomRole() != null
                ? interview.getCustomRole()
                : interview.getRole().getName();

        List<String> topics = interview.getRole().getTopics();
        if (topics == null || topics.isEmpty()) {
            topics = getDefaultTopicsForRole(roleContext);
        }
        String topic = topics.get(random.nextInt(topics.size()));

        String levelContext = switch (interview.getLevel()) {
            case FRESHER -> "a fresher with 0 years of experience";
            case ONE_TO_THREE_YEARS -> "someone with 1-3 years of experience";
            case THREE_PLUS_YEARS -> "a senior professional with 3+ years of experience";
        };

        String typeInstruction = switch (interview.getType()) {
            case TECHNICAL ->
                "Ask a TECHNICAL question testing specific knowledge, problem-solving, or concepts relevant to the role.";
            case HR_BEHAVIOURAL ->
                "Ask a BEHAVIOURAL question using STAR method scenario (Situation, Task, Action, Result). Reference realistic workplace situations.";
            case MIXED -> index % 2 == 0
                ? "Ask a TECHNICAL question about tools, concepts, or problem-solving relevant to the role."
                : "Ask a BEHAVIOURAL question about past experiences or hypothetical workplace scenarios.";
        };

        String previousQuestionsText = previousQuestions.stream()
            .map(QuestionAnswer::getQuestionText)
            .limit(5)
            .collect(Collectors.joining("\n- "));

        String prompt = String.format("""
            You are a senior interviewer conducting a %s interview for a %s role.
            The candidate is %s.
            Current topic to focus on: %s

            %s

            Rules:
            - Do NOT repeat or rephrase any of these previous questions:
              %s
            - Make the question SPECIFIC to the %s role, not generic
            - The question should take 2-4 minutes to answer
            - Sound like a real human interviewer, not an AI
            - No preamble like "Here's a question:" — just the question itself

            Return ONLY the question text.
            """,
            interview.getType().name().replace("_", " ").toLowerCase(),
            roleContext,
            levelContext,
            topic,
            typeInstruction,
            previousQuestionsText.isEmpty() ? "None yet" : previousQuestionsText,
            roleContext
        );

        try {
            String result = llmClientFactory.getClient().generate(prompt);
            log.info("✓ LLM generated Q{} for interview {} (role: {}, topic: {})",
                    index, interview.getId(), roleContext, topic);
            return result.trim();
        } catch (Exception e) {
            log.error("✗ LLM failed for Q{} (role: {}, topic: {}): {}",
                    index, roleContext, topic, e.getMessage());
            return generateFallbackQuestion(roleContext, index,
                    interview.getType().name().toLowerCase());
        }
    }

    private String generateFollowUpQuestion(Interview interview, QuestionAnswer lastAnswered) {
        String roleContext = interview.getCustomRole() != null
                ? interview.getCustomRole()
                : interview.getRole().getName();

        String prompt = String.format(
            "You are interviewing a candidate for a %s role. " +
            "They just answered: \"%s\"\n\n" +
            "Generate a focused follow-up question that digs deeper into a specific part of their answer. " +
            "Ask for a concrete example, a specific decision they made, or how they measured success. " +
            "Return ONLY the question text.",
            roleContext,
            lastAnswered.getUserTranscript()
        );

        try {
            String result = llmClientFactory.getClient().generate(prompt);
            log.info("✓ LLM generated follow-up for interview {}", interview.getId());
            return result.trim();
        } catch (Exception e) {
            log.error("✗ LLM follow-up failed: {}", e.getMessage());
            return "Can you walk me through a specific example of that? What was the outcome?";
        }
    }

    private String generateFallbackQuestion(String roleContext, int index, String typeContext) {
        String role = roleContext.toLowerCase();

        // Role-specific fallbacks
        if (role.contains("software") || role.contains("developer") || role.contains("engineer")) {
            String[] questions = {
                "Describe a complex technical problem you solved. What was your approach and what did you learn?",
                "How do you ensure code quality in your projects? Walk me through your process.",
                "Explain a time you had to learn a new technology quickly. How did you do it?",
                "Walk me through a system or feature you designed from scratch.",
                "How do you approach debugging a production issue under pressure?"
            };
            return questions[index % questions.length];
        } else if (role.contains("bank") || role.contains("government") || role.contains("exam")) {
            String[] questions = {
                "How do you handle situations where you need to follow strict rules and procedures?",
                "Describe a time you had to manage multiple priorities simultaneously.",
                "How would you handle a difficult customer complaint professionally?",
                "What motivates you to work in a public service or banking environment?",
                "Describe a situation where you caught an error before it became a problem."
            };
            return questions[index % questions.length];
        } else if (role.contains("business analyst") || role.contains("analyst")) {
            String[] questions = {
                "How do you gather and prioritize requirements from multiple stakeholders?",
                "Describe a time you identified a process improvement. How did you implement it?",
                "How do you handle conflicting requirements from different teams?",
                "Walk me through how you would document a complex business process.",
                "How do you validate that the solution built matches the original requirements?"
            };
            return questions[index % questions.length];
        } else {
            // Generic fallback
            String[] technical = {
                "Describe a challenging problem you solved recently. What was your approach?",
                "How do you prioritize tasks when everything seems urgent?",
                "Tell me about a project you're most proud of and why.",
                "How do you stay updated with developments in your field?",
                "Describe a time you had to deliver under a tight deadline."
            };
            String[] behavioral = {
                "Tell me about a time you disagreed with a teammate. How did you resolve it?",
                "Describe a situation where you had to adapt quickly to change.",
                "Give an example of when you took initiative without being asked.",
                "Tell me about a time you received critical feedback. How did you respond?",
                "Describe a project where collaboration was key to success."
            };
            String[] pool = typeContext.contains("technical") ? technical : behavioral;
            return pool[index % pool.length];
        }
    }

    private List<String> getDefaultTopicsForRole(String roleName) {
        String role = roleName.toLowerCase();
        if (role.contains("software") || role.contains("developer") || role.contains("swe")) {
            return List.of("data structures", "system design", "algorithms",
                    "code quality", "debugging", "teamwork", "past projects", "scalability");
        } else if (role.contains("bank") || role.contains("government")) {
            return List.of("general awareness", "reasoning", "numerical aptitude",
                    "customer service", "integrity", "pressure handling", "compliance");
        } else if (role.contains("business analyst") || role.contains("ba")) {
            return List.of("requirements gathering", "stakeholder management",
                    "process improvement", "data analysis", "documentation", "project management");
        } else if (role.contains("data") || role.contains("analyst")) {
            return List.of("SQL", "data visualization", "statistical analysis",
                    "business insights", "data cleaning", "reporting", "Excel");
        } else if (role.contains("manager") || role.contains("lead")) {
            return List.of("team leadership", "conflict resolution", "goal setting",
                    "performance management", "decision making", "stakeholder communication");
        } else if (role.contains("hr") || role.contains("human resource")) {
            return List.of("recruitment", "employee relations", "policy compliance",
                    "onboarding", "conflict resolution", "culture building");
        } else if (role.contains("sales") || role.contains("marketing")) {
            return List.of("client acquisition", "objection handling", "target achievement",
                    "product knowledge", "negotiation", "CRM tools", "market research");
        } else {
            return List.of("problem solving", "communication", "teamwork",
                    "time management", "adaptability", "domain knowledge");
        }
    }

    private QuestionAnswer createQuestion(Interview interview, int index,
                                           String questionText, boolean isFollowUp,
                                           Long parentId) {
        return QuestionAnswer.builder()
            .interview(interview)
            .questionIndex(index)
            .questionText(questionText)
            .isFollowUp(isFollowUp)
            .parentQuestionId(parentId)
            .status(QuestionAnswer.Status.PENDING)
            .build();
    }
}