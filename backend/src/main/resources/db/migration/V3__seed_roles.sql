-- Seed roles for IT category
INSERT INTO roles (name, category, description, is_custom) VALUES
('Java Backend Developer', 'IT', 'Backend development with Java, Spring Boot, microservices', FALSE),
('Full Stack Developer', 'IT', 'End-to-end web development with frontend and backend', FALSE),
('Frontend Developer', 'IT', 'Frontend development with React, Vue, Angular', FALSE),
('Python Developer', 'IT', 'Python development for web, data, automation', FALSE),
('Data Analyst', 'IT', 'Data analysis, visualization, SQL, Python/R', FALSE),
('Data Engineer', 'IT', 'Data pipelines, ETL, big data technologies', FALSE),
('ML/AI Engineer', 'IT', 'Machine learning, deep learning, MLOps', FALSE),
('DevOps/Cloud Engineer', 'IT', 'CI/CD, cloud infrastructure, containerization', FALSE),
('QA/Testing Engineer', 'IT', 'Test automation, quality assurance, test strategies', FALSE),
('Mobile Developer', 'IT', 'iOS, Android, React Native, Flutter development', FALSE),
('Cybersecurity Engineer', 'IT', 'Security engineering, penetration testing, compliance', FALSE),
('Product Manager', 'IT', 'Product strategy, roadmap, stakeholder management', FALSE),
('Project Manager', 'IT', 'Agile/Scrum, project planning, delivery management', FALSE),
('Technical Support Engineer', 'IT', 'Customer technical support, troubleshooting, escalation', FALSE);

-- Seed role topics
INSERT INTO role_topics (role_id, topic) VALUES
(1, 'Spring Boot'), (1, 'Microservices'), (1, 'REST APIs'), (1, 'JPA/Hibernate'), (1, 'Kafka'), (1, 'Docker'), (1, 'Kubernetes'), (1, 'System Design'),
(2, 'React'), (2, 'Node.js'), (2, 'Databases'), (2, 'API Design'), (2, 'Authentication'), (2, 'Testing'), (2, 'Deployment'), (2, 'System Design'),
(3, 'React/Vue/Angular'), (3, 'TypeScript'), (3, 'CSS/SCSS'), (3, 'State Management'), (3, 'Performance'), (3, 'Testing'), (3, 'Accessibility'), (3, 'Build Tools'),
(4, 'Django/FastAPI'), (4, 'Data Structures'), (4, 'Algorithms'), (4, 'Databases'), (4, 'Testing'), (4, 'Async Programming'), (4, 'Cloud'), (4, 'System Design'),
(5, 'SQL'), (5, 'Tableau/PowerBI'), (5, 'Python/Pandas'), (5, 'Statistics'), (5, 'Data Visualization'), (5, 'ETL'), (5, 'Business Metrics'), (5, 'Communication'),
(6, 'Spark'), (6, 'Kafka'), (6, 'Airflow'), (6, 'Data Modeling'), (6, 'Data Warehousing'), (6, 'Cloud Platforms'), (6, 'SQL'), (6, 'Performance Tuning'),
(7, 'PyTorch/TensorFlow'), (7, 'MLOps'), (7, 'Model Deployment'), (7, 'Feature Engineering'), (7, 'Deep Learning'), (7, 'NLP/CV'), (7, 'Experiment Tracking'), (7, 'Model Monitoring'),
(8, 'AWS/GCP/Azure'), (8, 'Terraform'), (8, 'Kubernetes'), (8, 'CI/CD'), (8, 'Monitoring'), (8, 'Scripting'), (8, 'Networking'), (8, 'Security'),
(9, 'Selenium/Cypress'), (9, 'Test Automation'), (9, 'API Testing'), (9, 'Performance Testing'), (9, 'Test Strategy'), (9, 'Bug Reporting'), (9, 'CI/CD Integration'), (9, 'Quality Metrics'),
(10, 'Swift/Kotlin'), (10, 'React Native/Flutter'), (10, 'Mobile Architecture'), (10, 'Offline Storage'), (10, 'Push Notifications'), (10, 'App Store'), (10, 'Performance'), (10, 'Testing'),
(11, 'Network Security'), (11, 'Application Security'), (11, 'Cryptography'), (11, 'Compliance'), (11, 'Incident Response'), (11, 'Penetration Testing'), (11, 'Security Architecture'), (11, 'DevSecOps'),
(12, 'Product Strategy'), (12, 'User Research'), (12, 'Roadmapping'), (12, 'Metrics/KPIs'), (12, 'Stakeholder Management'), (12, 'Prioritization'), (12, 'A/B Testing'), (12, 'Go-to-Market'),
(13, 'Agile/Scrum'), (13, 'Risk Management'), (13, 'Resource Planning'), (13, 'Jira/Confluence'), (13, 'Budgeting'), (13, 'Status Reporting'), (13, 'Team Leadership'), (13, 'Delivery'),
(14, 'Troubleshooting'), (14, 'Customer Communication'), (14, 'Ticket Management'), (14, 'Root Cause Analysis'), (14, 'Escalation'), (14, 'Documentation'), (14, 'SLA Management'), (14, 'Tools');

-- MBA/Business roles
INSERT INTO roles (name, category, description, is_custom) VALUES
('Finance', 'MBA/Business', 'Financial analysis, modeling, valuation, markets', FALSE),
('Marketing', 'MBA/Business', 'Brand, digital marketing, growth, analytics', FALSE),
('Human Resources', 'MBA/Business', 'Talent acquisition, employee relations, org development', FALSE),
('Operations', 'MBA/Business', 'Supply chain, process improvement, operations strategy', FALSE),
('Consulting', 'MBA/Business', 'Strategy consulting, case interviews, problem solving', FALSE),
('Business Analyst', 'MBA/Business', 'Requirements, process modeling, data analysis, stakeholders', FALSE),
('Sales', 'MBA/Business', 'B2B sales, account management, negotiation, pipeline', FALSE);

INSERT INTO role_topics (role_id, topic) VALUES
(15, 'Financial Modeling'), (15, 'Valuation'), (15, 'Accounting'), (15, 'Excel'), (15, 'Markets'), (15, 'Risk'), (15, 'Regulations'), (15, 'Case Studies'),
(16, 'Digital Marketing'), (16, 'Brand Strategy'), (16, 'Growth'), (16, 'Analytics'), (16, 'SEO/SEM'), (16, 'Content'), (16, 'Social Media'), (16, 'Budgeting'),
(17, 'Recruiting'), (17, 'Employee Relations'), (17, 'Compensation'), (17, 'Learning & Development'), (17, 'HRIS'), (17, 'Compliance'), (17, 'Culture'), (17, 'Org Design'),
(18, 'Supply Chain'), (18, 'Process Improvement'), (18, 'Lean/Six Sigma'), (18, 'Vendor Management'), (18, 'Logistics'), (18, 'Capacity Planning'), (18, 'Quality'), (18, 'Strategy'),
(19, 'Case Interviews'), (19, 'Frameworks'), (19, 'Market Sizing'), (19, 'Profitability'), (19, 'M&A'), (19, 'Strategy'), (19, 'Communication'), (19, 'Structured Thinking'),
(20, 'Requirements Engineering'), (20, 'Process Modeling'), (20, 'SQL'), (20, 'Data Analysis'), (20, 'Stakeholder Management'), (20, 'Agile'), (20, 'Documentation'), (20, 'User Stories'),
(21, 'B2B Sales'), (21, 'Account Management'), (21, 'Negotiation'), (21, 'Pipeline Management'), (21, 'CRM'), (21, 'Forecasting'), (21, 'Discovery'), (21, 'Closing');

-- General roles
INSERT INTO roles (name, category, description, is_custom) VALUES
('Fresher HR Round', 'General', 'Entry-level HR interview for fresh graduates', FALSE),
('Bank/Government Exam', 'General', 'Competitive exam interview preparation', FALSE);

INSERT INTO role_topics (role_id, topic) VALUES
(22, 'Self Introduction'), (22, 'Strengths/Weaknesses'), (22, 'Why This Company'), (22, 'Career Goals'), (22, 'Situational Questions'), (22, 'Teamwork'), (22, 'Adaptability'), (22, 'Questions for Interviewer'),
(23, 'Current Affairs'), (23, 'General Knowledge'), (23, 'Quantitative Aptitude'), (23, 'Reasoning'), (23, 'English'), (23, 'Domain Knowledge'), (23, 'Situational Judgment'), (23, 'Ethics');