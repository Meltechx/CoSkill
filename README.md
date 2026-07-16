# CoSkill

AI-powered work performance tracking and talent discovery platform.

## Tech Stack

- **Backend**: FastAPI (Python) + Supabase
- **Frontend**: Next.js 14 + Tailwind CSS
- **AI**: OpenAI API

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
    │   └── dashboard/  # Dashboard page
    └── components/     # Reusable UI components
        ├── ui/         # Button, Input, Card
        ├── layout/     # Navbar, Sidebar
        └── dashboard/  # StatsCard
```

## Getting Started

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
