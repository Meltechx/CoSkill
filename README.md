# CoSkill

AI-powered work performance tracking and talent discovery platform.

## Tech Stack

- **Backend**: FastAPI (Python) + Supabase
- **Frontend**: Next.js 14 + Tailwind CSS
- **AI**: Anthropic Claude API

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

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Fill in your Supabase and Anthropic keys in .env

# Run the dev server
uvicorn main:app --reload
```

API will be available at `http://localhost:8000`.
Interactive docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp ../.env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

# Run the dev server
npm run dev
```

App will be available at `http://localhost:3000`.

## Environment Variables

See `backend/.env.example` for required variables:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) |
| `JWT_SECRET` | Secret for signing JWTs |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI insights |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/projects/` | List projects |
| POST | `/api/projects/` | Create project |
| GET | `/api/tasks/` | List tasks |
| POST | `/api/tasks/` | Create task |
| POST | `/api/tasks/{id}/complete` | Complete a task |
| GET | `/api/performance/summary` | Performance summary |
| GET | `/api/performance/leaderboard` | Team leaderboard |
| GET | `/api/performance/insights` | AI-generated insights |
