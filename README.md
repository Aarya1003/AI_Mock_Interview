# AI Mock Interview Platform

A full-stack web application for practicing mock interviews with an AI interviewer.

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS 4 + React Router
- **Backend**: Spring Boot 3.2 + Java 21 + MySQL + Flyway
- **Auth**: JWT with BCrypt password hashing
- **LLM**: Pluggable interface (Gemini / NVIDIA NIM)
- **Voice**: Web Speech API (input) + SpeechSynthesis (output)
- **Billing**: Razorpay (test mode)

## Project Structure

```
AI_Interview_System/
├── backend/                 # Spring Boot application
│   ├── src/main/java/com/aiinterview/backend/
│   │   ├── auth/           # Authentication (signup, login, JWT)
│   │   ├── config/         # Configuration classes
│   │   ├── common/         # Shared utilities
│   │   ├── interview/      # Interview engine, state machine
│   │   ├── llm/            # LLM client interface & implementations
│   │   ├── question/       # Question/Answer entities
│   │   ├── report/         # Report generation
│   │   ├── role/           # Role catalogue
│   │   ├── security/       # JWT filter, security config
│   │   └── user/           # User entity & repository
│   └── src/main/resources/
│       ├── application.yml  # Configuration
│       └── db/migration/    # Flyway migrations
│
└── frontend/                # React + Vite application
    ├── src/
    │   ├── components/      # Reusable UI components
    │   ├── context/         # React context (Auth)
    │   ├── hooks/           # Custom hooks
    │   ├── pages/           # Page components
    │   ├── services/        # API services
    │   ├── types/           # TypeScript types
    │   └── utils/           # Utilities
    └── ...
```

## Prerequisites

- Java 21+
- Maven 3.9+
- Node.js 18+
- MySQL 8.0+
- (Optional) Gemini API key or NVIDIA NIM API key

## Setup

### 1. Database

```sql
CREATE DATABASE ai_interview;
```

### 2. Backend Configuration

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials and API keys
```

Required environment variables:
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` - MySQL connection
- `JWT_SECRET` - Base64 encoded secret (min 32 chars). Generate with: `openssl rand -base64 32`
- `LLM_PROVIDER` - `gemini` or `nvidia`
- `GEMINI_API_KEY` or `NVIDIA_API_KEY` - For AI question generation

### 3. Frontend Configuration

```bash
cd frontend
cp .env.example .env
# Usually no changes needed for dev (uses Vite proxy)
```

### 4. Run Backend

```bash
cd backend
./mvnw spring-boot:run
```

Backend runs on `http://localhost:8080/api`

### 5. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Features Implemented (Phase 0-1)

- ✅ User authentication (signup, login, logout, JWT)
- ✅ Password hashing with BCrypt
- ✅ Protected routes on frontend
- ✅ Role catalogue with 23 pre-seeded roles across IT, MBA/Business, General
- ✅ Interview setup flow (role → level → type → duration → camera)
- ✅ Interview CRUD (create, list, start, submit answers, complete)
- ✅ Interview engine with state machine (warmup → core → follow-ups → closing)
- ✅ Dashboard with interview history
- ✅ Report view with score breakdown
- ✅ Free/Pro plan gating (1 interview/month, 15min max for Free)

## API Endpoints

### Auth
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Roles
- `GET /api/roles` - Get all roles grouped by category
- `GET /api/roles/custom` - Get custom roles
- `POST /api/roles/custom` - Create custom role
- `GET /api/roles/{id}` - Get role details

### Interviews
- `POST /api/interviews` - Create interview
- `GET /api/interviews` - List user's interviews
- `GET /api/interviews/{id}` - Get interview details
- `POST /api/interviews/{id}/start` - Start interview
- `POST /api/interviews/{id}/answer` - Submit answer
- `POST /api/interviews/{id}/next-question` - Get next question
- `POST /api/interviews/{id}/complete` - Complete interview
- `DELETE /api/interviews/{id}` - Delete interview

## Development

### Backend Tests
```bash
cd backend
./mvnw test
```

### Frontend Build
```bash
cd frontend
npm run build
```

### Frontend Lint
```bash
cd frontend
npm run lint
```

## Phases

- **Phase 0**: Plan + Scaffold ✅
- **Phase 1**: Auth + DB ✅
- **Phase 2**: Roles + Setup Screen ✅
- **Phase 3**: Interview Engine (text only) ✅
- **Phase 4**: Voice In/Out (Web Speech API) 🔄
- **Phase 5**: Voice Metrics + Scoring + Report
- **Phase 6**: Camera
- **Phase 7**: Dashboard (enhanced)
- **Phase 8**: Billing (Razorpay)

## License

MIT