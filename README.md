# CoSkill — AI-Powered Work Performance Platform

> **Traditional CVs are just claims. CoSkill turns your work into verified proof.**

## Live Demo

| Service | URL |
|---|---|
| Frontend | https://coskill-nu.vercel.app |
| Backend API | https://coskill.onrender.com/docs |

## What is CoSkill?

CoSkill is an AI-powered platform that tracks real work output, scores performance objectively, and generates a verifiable skill profile — replacing static CVs with dynamic, evidence-backed proof of competence.

## Features

- **AI Task Decomposition** — Breaks projects into structured subtasks using GPT-5.6
- **Performance Scoring & Analytics** — Objective scoring with trend tracking and insights
- **Manipulation Detection & Verification** — Detects inflated self-reports and validates work authenticity
- **AI Sprint Planner** — Automatically plans and prioritizes work sprints
- **AI Team Matching** — Matches collaborators based on verified skill profiles
- **XP & Level System** — Gamified progression tied to real output
- **Judge Mode** — Demo presentation mode for live hackathon judging
- **PDF CV Export** — Generate a verified, exportable CV from your profile
- **Hackathon Discovery** — Browse and join hackathons from within the platform
- **Public Profile & Skill Radar** — Shareable profile with a visual skill radar chart

## Tech Stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js + Tailwind CSS | Vercel |
| Backend | FastAPI (Python) | Render |
| Database | Supabase (PostgreSQL) | Supabase |
| AI | GPT-5.6 (OpenAI) | OpenAI |

Built with **OpenAI Codex**.

## Project Structure

```
CoSkill/
├── backend/
│   ├── routers/        # API route handlers (auth, projects, tasks, performance)
│   ├── models/         # Pydantic schemas
│   ├── services/       # Business logic layer
│   ├── main.py         # FastAPI app entry point
│   ├── .env.example    # Environment variable template
│   └── requirements.txt
└── frontend/
    ├── app/            # Next.js App Router pages
    │   ├── (auth)/     # Login & Register pages
    │   └── dashboard/  # Dashboard & feature pages
    └── components/     # Reusable UI components
        ├── ui/         # Button, Input, Card
        ├── layout/     # Navbar, Sidebar
        └── dashboard/  # StatsCard, SkillRadar, Leaderboard
```

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in your Supabase and OpenAI keys in .env
uvicorn main:app --reload
```

API docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App at `http://localhost:3000`.

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `OPENAI_API_KEY` | OpenAI API key |
| `SECRET_KEY` | Secret for signing JWTs |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/projects/` | List projects |
| POST | `/api/projects/` | Create project |
| GET | `/api/projects/{id}/tasks` | List tasks for project |
| POST | `/api/tasks/{id}/complete` | Complete a task |
| PATCH | `/api/tasks/{id}/status` | Update task status |
| GET | `/api/performance/summary` | Performance summary |
| GET | `/api/performance/leaderboard` | Team leaderboard |
| GET | `/api/performance/insights` | AI-generated insights |
| POST | `/api/projects/{id}/decompose` | AI task decomposition |

## Codex Session ID

[session id here]

## License

See [LICENSE](./LICENSE).
