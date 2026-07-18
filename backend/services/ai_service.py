import json
from fastapi import HTTPException, status
from openai import AsyncOpenAI

from config import settings

SYSTEM_PROMPT = (
    "You are a project manager. Break down the given project goal into actionable subtasks.\n"
    "Return a JSON object with a \"tasks\" array. Each task must have exactly these fields:\n"
    "  - title (string): short, action-oriented task name\n"
    "  - description (string): clear explanation of what needs to be done\n"
    "  - difficulty (string): one of \"easy\", \"medium\", \"hard\", \"expert\"\n"
    "  - estimated_hours (number): realistic time estimate as a positive number\n"
    "  - skill_tags (array of strings): 1-4 relevant skills, e.g. [\"python\", \"api\", \"database\"]\n"
    "Aim for 4-8 tasks. Return only valid JSON, no extra text."
)

VALID_DIFFICULTIES = {"easy", "medium", "hard", "expert"}

INSIGHTS_SYSTEM_PROMPT = (
    "You are a career coach specializing in software development skills. "
    "Analyze a developer's skill performance data and return a JSON object with exactly these fields:\n"
    "  - strengths: array of exactly 3 short strings (skills or habits the user excels at)\n"
    "  - improvements: array of exactly 3 short strings (concrete areas to work on)\n"
    "  - next_skill: string (single most impactful skill to learn or deepen next)\n"
    "  - summary: string (1-2 sentences of overall assessment, encouraging but honest)\n"
    "Be specific to the skill data provided. Return only valid JSON, no extra text."
)

VERIFICATION_QUESTION_SYSTEM_PROMPT = (
    "You verify whether someone genuinely completed a software task. "
    "Write one concise, task-specific question that requires the person to explain "
    "a concrete implementation decision, result, or trade-off. Return JSON only: {\"question\": \"...\"}."
)

VERIFICATION_EVALUATION_SYSTEM_PROMPT = (
    "You assess whether a user's answer credibly demonstrates they completed a task. "
    "Score it from 1 to 10. Score 1-4 for vague, irrelevant, or implausible answers; "
    "score 5-10 for specific, relevant explanations. Return JSON only: {\"score\": integer}."
)


class AIService:
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OPENAI_API_KEY is not configured.",
            )
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def decompose_project(self, title: str, goal: str) -> list[dict]:
        user_message = f"Project title: {title}\nProject goal: {goal}"

        try:
            response = await self.client.chat.completions.create(
                model="gpt-5.6",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                response_format={"type": "json_object"},
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"OpenAI API error: {str(e)}",
            )

        raw = response.choices[0].message.content
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="OpenAI returned malformed JSON.",
            )

        tasks = data.get("tasks")
        if not isinstance(tasks, list) or len(tasks) == 0:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="OpenAI response missing 'tasks' array.",
            )

        return [self._validate_task(t, i) for i, t in enumerate(tasks)]

    async def generate_insights(
        self,
        skill_scores: list[dict],
        completed_tasks: int,
        overall_score: float,
    ) -> dict:
        if skill_scores:
            skills_text = "\n".join(
                f"  - {s['skill']}: {s['score']}/100 ({s['tasks_count']} task{'s' if s['tasks_count'] != 1 else ''})"
                for s in sorted(skill_scores, key=lambda x: x["score"], reverse=True)
            )
        else:
            skills_text = "  (no skill data yet)"

        user_message = (
            f"Developer profile:\n"
            f"  Overall score: {overall_score}/100\n"
            f"  Completed tasks: {completed_tasks}\n"
            f"  Skill breakdown:\n{skills_text}"
        )

        try:
            response = await self.client.chat.completions.create(
                model="gpt-5.6",
                messages=[
                    {"role": "system", "content": INSIGHTS_SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                response_format={"type": "json_object"},
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"OpenAI API error: {str(e)}",
            )

        raw = response.choices[0].message.content
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="OpenAI returned malformed JSON.",
            )

        return {
            "strengths": data.get("strengths") or [],
            "improvements": data.get("improvements") or [],
            "next_skill": data.get("next_skill") or "",
            "summary": data.get("summary") or "",
        }

    async def generate_verification_question(self, title: str, description: str | None) -> str:
        response = await self._json_completion(
            VERIFICATION_QUESTION_SYSTEM_PROMPT,
            f"Task title: {title}\nTask description: {description or 'No description provided.'}",
        )
        question = response.get("question")
        if not isinstance(question, str) or not question.strip():
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="OpenAI returned an invalid verification question.",
            )
        return question.strip()

    async def evaluate_verification_answer(
        self,
        title: str,
        description: str | None,
        question: str,
        answer: str,
    ) -> int:
        response = await self._json_completion(
            VERIFICATION_EVALUATION_SYSTEM_PROMPT,
            f"Task title: {title}\nTask description: {description or 'No description provided.'}\n"
            f"Verification question: {question}\nUser answer: {answer}",
        )
        try:
            return max(1, min(10, int(response.get("score"))))
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="OpenAI returned an invalid verification score.",
            )

    async def _json_completion(self, system_prompt: str, user_message: str) -> dict:
        try:
            response = await self.client.chat.completions.create(
                model="gpt-5.6",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                response_format={"type": "json_object"},
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"OpenAI API error: {str(e)}",
            )

        try:
            return json.loads(response.choices[0].message.content or "{}")
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="OpenAI returned malformed JSON.",
            )

    def _validate_task(self, task: dict, index: int) -> dict:
        if not isinstance(task.get("title"), str) or not task["title"].strip():
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Task {index}: missing or empty 'title'.",
            )

        difficulty = task.get("difficulty", "medium")
        if difficulty not in VALID_DIFFICULTIES:
            difficulty = "medium"

        try:
            estimated_hours = float(task.get("estimated_hours", 1))
            if estimated_hours <= 0:
                estimated_hours = 1.0
        except (TypeError, ValueError):
            estimated_hours = 1.0

        skill_tags = task.get("skill_tags", [])
        if not isinstance(skill_tags, list):
            skill_tags = []
        skill_tags = [str(s) for s in skill_tags if s]

        return {
            "title": task["title"].strip(),
            "description": str(task.get("description", "")).strip() or None,
            "difficulty": difficulty,
            "estimated_hours": estimated_hours,
            "skill_tags": skill_tags,
        }
