-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(500),
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role topics table
CREATE TABLE IF NOT EXISTS role_topics (
    role_id BIGINT NOT NULL,
    topic VARCHAR(200) NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Add columns to users table
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER';
ALTER TABLE users ADD COLUMN plan VARCHAR(20) NOT NULL DEFAULT 'FREE';
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    custom_role VARCHAR(200),
    level VARCHAR(30) NOT NULL,
    type VARCHAR(30) NOT NULL,
    duration_minutes INT NOT NULL,
    camera_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'SETUP',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    actual_duration_seconds INT,
    total_score INT,
    is_partial BOOLEAN NOT NULL DEFAULT FALSE,
    plan_at_time VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Question answers table
CREATE TABLE IF NOT EXISTS question_answers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    interview_id BIGINT NOT NULL,
    question_index INT NOT NULL,
    question_text TEXT NOT NULL,
    expected_topics TEXT,
    rubric TEXT,
    user_transcript TEXT,
    voice_metrics JSON,
    camera_metrics JSON,
    response_time_seconds INT,
    silence_duration_seconds INT,
    is_follow_up BOOLEAN NOT NULL DEFAULT FALSE,
    parent_question_id BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    score_correctness_depth INT,
    score_structure_clarity INT,
    score_confidence_tone INT,
    score_fluency INT,
    score_composure INT,
    total_score INT,
    feedback TEXT,
    strong_answer_points TEXT,
    llm_reasoning TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_question_id) REFERENCES question_answers(id)
);

-- Interruptions table
CREATE TABLE IF NOT EXISTS interruptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    interview_id BIGINT NOT NULL,
    question_answer_id BIGINT,
    type VARCHAR(40) NOT NULL,
    trigger_details TEXT,
    ai_response TEXT,
    user_reaction TEXT,
    timestamp_seconds INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
    FOREIGN KEY (question_answer_id) REFERENCES question_answers(id)
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    interview_id BIGINT NOT NULL UNIQUE,
    total_score INT NOT NULL,
    score_correctness_depth INT,
    score_structure_clarity INT,
    score_confidence_tone INT,
    score_fluency INT,
    score_composure INT,
    strengths JSON,
    improvements JSON,
    filler_word_counts JSON,
    confidence_timeline JSON,
    pace_timeline JSON,
    comparison_with_previous TEXT,
    llm_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_interviews_user_id ON interviews(user_id);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_question_answers_interview_id ON question_answers(interview_id);
CREATE INDEX idx_interruptions_interview_id ON interruptions(interview_id);