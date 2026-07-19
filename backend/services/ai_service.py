import json
import math
from datetime import datetime, timezone
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

PROJECT_RISK_SYSTEM_PROMPT = (
    "You are a pragmatic project delivery risk analyst. The deterministic scores supplied to you are final; "
    "do not recalculate, alter, or contradict them. Explain each factor in plain language using only the supplied "
    "metrics, then provide actions that directly reduce the stated risks. "
    "Return JSON only with exactly these fields:\n"
    "  - reasons: array of exactly 5 concise explanations, in this order: overdue tasks, unstarted critical tasks, "
    "time pressure, recent activity, flagged tasks\n"
    "  - recommendations: array of exactly 3 specific, imperative actions\n"
    "  - summary: one powerful sentence that states the supplied overall score as the chance of missing the deadline "
    "when a deadline is present (for example, '78% chance of missing the deadline unless...'); otherwise say "
    "chance of a delivery delay\n"
    "Do not invent deadlines, blockers, team size, task dates, or progress not present in the metrics."
)

RISK_WEIGHTS = {
    "overdue": 30,
    "unstarted_critical": 20,
    "time_pressure": 20,
    "activity": 15,
    "flagged": 10,
}
RISK_WEIGHT_TOTAL = sum(RISK_WEIGHTS.values())


def _parse_datetime(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _percentage(numerator: int, denominator: int) -> float:
    return 0.0 if denominator <= 0 else min(100.0, 100.0 * numerator / denominator)


def _risk_level(score: int) -> str:
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"


def calculate_project_risk(
    project: dict,
    tasks: list[dict],
    now: datetime | None = None,
) -> dict:
    """Calculate repeatable delivery-risk scores from stored project and task data.

    The current schema provides a project deadline; an optional per-task ``deadline``
    or ``due_date`` is also honoured if it becomes available. The five requested
    weights total 95%, so their weighted average is normalized back to a 0--100 score.
    """
    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)

    active_tasks = [task for task in tasks if task.get("status") != "cancelled"]
    open_tasks = [task for task in active_tasks if task.get("status") != "completed"]
    task_count = len(active_tasks)
    open_count = len(open_tasks)

    deadline = _parse_datetime(project.get("deadline"))
    created_at = _parse_datetime(project.get("created_at"))
    def is_overdue(task: dict) -> bool:
        task_deadline = _parse_datetime(task.get("deadline") or task.get("due_date"))
        effective_deadline = task_deadline or deadline
        return bool(effective_deadline and effective_deadline < current_time)

    overdue_count = sum(is_overdue(task) for task in open_tasks)
    overdue_score = _percentage(overdue_count, open_count)

    unstarted_critical_count = sum(
        task.get("status") == "todo" and task.get("difficulty") in {"hard", "expert"}
        for task in active_tasks
    )
    unstarted_critical_score = _percentage(unstarted_critical_count, open_count)

    days_until_deadline: float | None = None
    total_schedule_days: float | None = None
    if deadline:
        days_until_deadline = (deadline - current_time).total_seconds() / 86_400
        if created_at and deadline > created_at:
            total_schedule_days = (deadline - created_at).total_seconds() / 86_400
        else:
            total_schedule_days = max(days_until_deadline, 1.0)
        elapsed_schedule = 1 - max(0.0, days_until_deadline) / max(total_schedule_days, 1.0)
        # Calendar pressure matters only while work remains; a completed project is
        # not at delivery risk merely because its deadline is in the past.
        time_pressure_score = min(100.0, elapsed_schedule * 100 * (open_count / max(task_count, 1)))
    else:
        time_pressure_score = 0.0

    recent_cutoff = current_time.timestamp() - 3 * 86_400
    recent_completed_count = sum(
        task.get("status") == "completed"
        and (completed_at := _parse_datetime(task.get("completed_at"))) is not None
        and completed_at.timestamp() >= recent_cutoff
        for task in active_tasks
    )
    # Completing roughly a quarter of the remaining work in three days is treated as
    # healthy activity; less recent throughput proportionally increases risk.
    activity_target = max(1, math.ceil(open_count * 0.25))
    activity_score = 0.0 if open_count == 0 else 100.0 * (1 - min(1.0, recent_completed_count / activity_target))

    flagged_count = sum(bool(task.get("is_flagged")) for task in active_tasks)
    flagged_score = _percentage(flagged_count, task_count)

    factor_scores = {
        "overdue": round(overdue_score),
        "unstarted_critical": round(unstarted_critical_score),
        "time_pressure": round(time_pressure_score),
        "activity": round(activity_score),
        "flagged": round(flagged_score),
    }
    weighted_score = sum(factor_scores[name] * weight for name, weight in RISK_WEIGHTS.items())
    overall_score = round(weighted_score / RISK_WEIGHT_TOTAL)
    category_scores = {
        "schedule": round((factor_scores["overdue"] * 30 + factor_scores["time_pressure"] * 20) / 50),
        "task": factor_scores["unstarted_critical"],
        "activity": factor_scores["activity"],
        "quality": factor_scores["flagged"],
    }

    return {
        "overall_score": overall_score,
        "risk_level": _risk_level(overall_score),
        "category_scores": category_scores,
        "factor_scores": factor_scores,
        "metrics": {
            "total_tasks": task_count,
            "open_tasks": open_count,
            "overdue_tasks": overdue_count,
            "unstarted_critical_tasks": unstarted_critical_count,
            "recent_completed_tasks": recent_completed_count,
            "flagged_tasks": flagged_count,
            "days_until_deadline": round(days_until_deadline, 1) if days_until_deadline is not None else None,
            "total_schedule_days": round(total_schedule_days, 1) if total_schedule_days is not None else None,
            "has_deadline": deadline is not None,
        },
    }


def _fallback_risk_copy(calculated_risk: dict) -> tuple[list[str], list[str]]:
    """Keep the deterministic endpoint explainable if a model response is incomplete."""
    metrics = calculated_risk["metrics"]
    factors = calculated_risk["factor_scores"]
    deadline_text = (
        f"{metrics['days_until_deadline']} days remain in a {metrics['total_schedule_days']}-day schedule"
        if metrics["has_deadline"]
        else "no project deadline has been set"
    )
    reasons = [
        f"{metrics['overdue_tasks']} open task(s) are past the project deadline (schedule score: {factors['overdue']}/100).",
        f"{metrics['unstarted_critical_tasks']} hard or expert task(s) have not been started (task score: {factors['unstarted_critical']}/100).",
        f"Time pressure is based on {deadline_text} (score: {factors['time_pressure']}/100).",
        f"{metrics['recent_completed_tasks']} task(s) were completed in the last 3 days (activity score: {factors['activity']}/100).",
        f"{metrics['flagged_tasks']} task(s) are flagged for review (quality score: {factors['flagged']}/100).",
    ]
    candidates = [
        (factors["overdue"], f"Triage and re-plan the {metrics['overdue_tasks']} overdue task(s) today."),
        (factors["unstarted_critical"], f"Start or assign the {metrics['unstarted_critical_tasks']} unstarted hard/expert task(s)."),
        (factors["time_pressure"], "Break the remaining work into a deadline-focused plan for the next three days."),
        (factors["activity"], "Complete one clearly scoped task today to restore delivery momentum."),
        (factors["flagged"], f"Review and resolve the {metrics['flagged_tasks']} flagged task(s) before relying on their progress."),
    ]
    recommendations = [recommendation for _, recommendation in sorted(candidates, reverse=True)[:3]]
    return reasons, recommendations


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

    async def analyze_project_risk(self, calculated_risk: dict) -> dict:
        """Use GPT solely to explain a score calculated from persisted data."""
        metrics = calculated_risk["metrics"]
        factor_scores = calculated_risk["factor_scores"]
        category_scores = calculated_risk["category_scores"]
        user_message = (
            "Deterministic project risk result (do not change any score):\n"
            f"- Overall score: {calculated_risk['overall_score']}/100\n"
            f"- Risk level: {calculated_risk['risk_level']}\n"
            f"- Category scores: schedule {category_scores['schedule']}/100, task {category_scores['task']}/100, "
            f"activity {category_scores['activity']}/100, quality {category_scores['quality']}/100\n\n"
            "Factor metrics and their fixed scores:\n"
            f"- Overdue tasks (30% weight): {metrics['overdue_tasks']} of {metrics['open_tasks']} open; score {factor_scores['overdue']}/100\n"
            f"- Unstarted hard/expert tasks (20% weight): {metrics['unstarted_critical_tasks']} of {metrics['open_tasks']} open; score {factor_scores['unstarted_critical']}/100\n"
            f"- Time pressure (20% weight): {metrics['days_until_deadline']} days until deadline out of "
            f"{metrics['total_schedule_days']} total schedule days; deadline present: {metrics['has_deadline']}; "
            f"score {factor_scores['time_pressure']}/100\n"
            f"- Activity (15% weight): {metrics['recent_completed_tasks']} tasks completed in the last 3 days; "
            f"score {factor_scores['activity']}/100\n"
            f"- Flagged tasks (10% weight): {metrics['flagged_tasks']} of {metrics['total_tasks']} tasks flagged; "
            f"score {factor_scores['flagged']}/100\n"
        )
        response = await self._json_completion(PROJECT_RISK_SYSTEM_PROMPT, user_message)

        def text_list(key: str, limit: int) -> list[str]:
            value = response.get(key)
            if not isinstance(value, list):
                return []
            return [item.strip() for item in value if isinstance(item, str) and item.strip()][:limit]

        fallback_reasons, fallback_recommendations = _fallback_risk_copy(calculated_risk)
        reasons = text_list("reasons", 5)
        recommendations = text_list("recommendations", 3)
        if len(reasons) != 5:
            reasons = fallback_reasons
        if len(recommendations) != 3:
            recommendations = fallback_recommendations
        summary = response.get("summary")
        summary = summary.strip() if isinstance(summary, str) else ""
        if not summary or f"{calculated_risk['overall_score']}%" not in summary:
            outcome = "missing the deadline" if metrics["has_deadline"] else "a delivery delay"
            summary = f"{calculated_risk['overall_score']}% chance of {outcome} without focused action on the highest-risk work."

        return {
            "overall_score": calculated_risk["overall_score"],
            "risk_level": calculated_risk["risk_level"],
            "category_scores": category_scores,
            "reasons": reasons,
            "recommendations": recommendations,
            "summary": summary,
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
