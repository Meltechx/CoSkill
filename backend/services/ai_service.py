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

JUDGE_PITCH_SYSTEM_PROMPT = (
    "You create a concise, confident 30-second demo-day pitch for CoSkill, a platform that turns completed "
    "software work into verifiable proof. Return JSON only with exactly these fields:\n"
    "  - solution: one sentence explaining what CoSkill does\n"
    "  - impact: one sentence that naturally references the supplied user stats without inventing metrics\n"
    "  - demo_flow: exactly 5 short, imperative click-through steps\n"
    "  - ai_use: one sentence explaining how GPT-5.6 powers task decomposition, scoring, and verification\n"
    "Keep the total spoken content brief enough for a 30-second presentation."
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

    async def generate_judge_pitch(self, stats: dict) -> dict:
        response = await self._json_completion(
            JUDGE_PITCH_SYSTEM_PROMPT,
            "CoSkill presenter statistics:\n"
            f"- Projects tracked: {stats['total_projects']}\n"
            f"- Tasks tracked: {stats['total_tasks']}\n"
            f"- Tasks completed: {stats['completed_tasks']}\n"
            f"- Skills tracked: {stats['skills_tracked']}\n",
        )

        def required_text(key: str) -> str:
            value = response.get(key)
            if not isinstance(value, str) or not value.strip():
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"OpenAI returned an invalid judge-pitch {key}.",
                )
            return value.strip()

        demo_flow = response.get("demo_flow")
        if not isinstance(demo_flow, list):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="OpenAI returned an invalid judge-pitch demo flow.",
            )
        demo_flow = [step.strip() for step in demo_flow if isinstance(step, str) and step.strip()][:5]
        if len(demo_flow) != 5:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="OpenAI returned an incomplete judge-pitch demo flow.",
            )

        return {
            "solution": required_text("solution"),
            "impact": required_text("impact"),
            "demo_flow": demo_flow,
            "ai_use": required_text("ai_use"),
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

    async def chat_about_task(self, title: str, description: str | None, difficulty: str, message: str) -> str:
        context = (
            "You are CoSkill's helpful project assistant. Give concise, practical guidance about the user's task. "
            "Do not claim work was completed; explain approaches, next steps, trade-offs, and troubleshooting.\n\n"
            f"Task title: {title}\nTask description: {description or 'No description provided.'}\n"
            f"Difficulty: {difficulty}"
        )
        try:
            response = await self.client.chat.completions.create(
                model="gpt-5.6",
                messages=[
                    {"role": "system", "content": context},
                    {"role": "user", "content": message},
                ],
            )
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"OpenAI API error: {str(e)}")

        reply = response.choices[0].message.content
        if not reply:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="OpenAI returned an empty task-chat response.")
        return reply.strip()

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

    async def analyze_file_relevance(
        self,
        title: str,
        description: str | None,
        file_summaries: list[str],
    ) -> dict:
        system_prompt = (
            "You verify uploaded files as proof of work for a software task and, when appropriate, review their code.\n\n"
            "For text files (code, config, docs) you will receive the first 1000 characters of content — "
            "read the actual code/text and judge whether it plausibly relates to the task.\n"
            "For binary files (images, archives) you only have the filename — judge by name and type.\n\n"
            "A file is relevant if its content, structure, or name reasonably relates to the task's subject, "
            "technologies, or deliverables. Be lenient — screenshots, test outputs, configs, and partial "
            "implementations all count as valid proof.\n\n"
            "If the files are relevant, perform a concise code review of the text content provided. Identify up to "
            "3 concrete bugs or code-quality issues and up to 2 actionable improvements. Do not invent issues for "
            "binary files, screenshots, or content that is not available. Give a quality_score from 0 to 100.\n\n"
            "Return JSON only with exactly these fields: "
            "{\"relevant\": true/false, \"reason\": \"one sentence explanation\", "
            "\"quality_score\": 0-100, \"issues\": [\"issue\"], \"suggestions\": [\"suggestion\"]}. "
            "When files are not relevant, set quality_score to 0 and issues and suggestions to empty arrays."
        )
        files_text = "\n\n".join(f"--- {i+1}. {s}" for i, s in enumerate(file_summaries))
        user_message = (
            f"Task title: {title}\n"
            f"Task description: {description or 'No description provided.'}\n\n"
            f"Uploaded files:\n\n{files_text}"
        )
        result = await self._json_completion(system_prompt, user_message)
        relevant = result.get("relevant") is True

        quality_score = result.get("quality_score", 0)
        try:
            quality_score = max(0, min(100, int(quality_score)))
        except (TypeError, ValueError):
            quality_score = 0

        def string_list(value: object, limit: int) -> list[str]:
            if not isinstance(value, list):
                return []
            return [item.strip() for item in value if isinstance(item, str) and item.strip()][:limit]

        return {
            "relevant": relevant,
            "reason": result.get("reason", "Unable to determine file relevance.")
            if isinstance(result.get("reason"), str)
            else "Unable to determine file relevance.",
            "quality_score": quality_score if relevant else 0,
            "issues": string_list(result.get("issues"), 3) if relevant else [],
            "suggestions": string_list(result.get("suggestions"), 2) if relevant else [],
        }

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
