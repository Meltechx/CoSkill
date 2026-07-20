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

SPRINT_PLANNER_SYSTEM_PROMPT = (
    "You are an expert software delivery lead. Create a practical sprint plan using only the supplied incomplete "
    "project tasks. Return JSON only with exactly these fields:\n"
    "  - sprint_goal: one concise outcome for the sprint\n"
    "  - risk_level: one of low, medium, high\n"
    "  - risk_reason: one concise explanation for the risk level\n"
    "  - completion_probability: an integer from 0 to 100\n"
    "  - recommendations: an array of 3-5 specific, imperative recommendations\n"
    "  - phases: an ordered array of 2-5 phases, each with time_range, focus, and tasks\n"
    "Each task item must include task_id, title, assignee, estimated_hours, priority, ai_reason, depends_on, and blocks. "
    "priority must be critical, high, medium, or low. ai_reason concisely explains why the task is placed in that phase. "
    "depends_on and blocks must be arrays of supplied task titles only. Use only supplied task IDs and titles, assign "
    "work evenly across Team member 1 through the supplied team size, and keep every time range within the sprint "
    "duration. Do not invent tasks or dependencies."
)

TEAM_MATCHING_SYSTEM_PROMPT = (
    "You are an AI team matching expert. Given a project's requirements and a list of available candidates, "
    "rank the candidates by compatibility. For each candidate, provide a compatibility percentage (0-100) and "
    "a one-sentence explanation of why they are a good fit.\n\n"
    "Return JSON only: {\"matches\": [{\"user_id\": \"...\", \"compatibility\": integer, \"explanation\": \"...\"}]}\n"
    "Return up to 10 matches, sorted by compatibility descending. Only include candidates with compatibility >= 20."
)

DASHBOARD_ASSISTANT_SYSTEM_PROMPT = (
    "You are CoSkill's concise, practical AI work assistant. Use only the supplied dashboard context to answer "
    "questions about what the user should work on, their progress, or their next task. Prefer a concrete next action, "
    "mention a task or project by name when available, and do not claim that work is complete unless the context says so. "
    "Keep responses under 180 words and use short bullets when that improves scanability."
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

    async def plan_sprint(
        self,
        project: dict,
        tasks: list[dict],
        duration_hours: float,
        team_size: int,
    ) -> dict:
        open_tasks = [task for task in tasks if task.get("status") not in {"completed", "cancelled"}]
        if not open_tasks:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Add incomplete tasks before planning a sprint.")

        task_lines = "\n".join(
            f"- ID: {task['id']} | title: {task['title']} | difficulty: {task.get('difficulty', 'medium')} | "
            f"estimate: {task.get('estimated_hours') or 'unspecified'} hours | description: {task.get('description') or 'None'}"
            for task in open_tasks
        )
        response = await self._json_completion(
            SPRINT_PLANNER_SYSTEM_PROMPT,
            f"Project: {project['title']}\nGoal: {project.get('goal') or project.get('description') or project['title']}\n"
            f"Sprint duration: {duration_hours:g} hours\nTeam size: {team_size}\nIncomplete tasks:\n{task_lines}",
        )

        task_by_id = {str(task["id"]): task for task in open_tasks}
        task_titles = {str(task["title"]) for task in open_tasks}
        phases = []
        raw_phases = response.get("phases")
        for phase in raw_phases if isinstance(raw_phases, list) else []:
            if not isinstance(phase, dict):
                continue
            assignments = []
            raw_assignments = phase.get("tasks")
            for item in raw_assignments if isinstance(raw_assignments, list) else []:
                if not isinstance(item, dict) or str(item.get("task_id")) not in task_by_id:
                    continue
                task = task_by_id[str(item["task_id"])]
                try:
                    estimated_hours = max(0.25, float(item.get("estimated_hours") or task.get("estimated_hours") or 1))
                except (TypeError, ValueError):
                    estimated_hours = 1.0
                assignee = item.get("assignee")
                assignee = assignee.strip() if isinstance(assignee, str) and assignee.strip() else "Team member 1"
                priority = item.get("priority")
                priority = priority if priority in {"critical", "high", "medium", "low"} else "medium"
                ai_reason = item.get("ai_reason")
                ai_reason = ai_reason.strip() if isinstance(ai_reason, str) and ai_reason.strip() else "Scheduled to keep the sprint moving."

                def related_titles(key: str) -> list[str]:
                    value = item.get(key)
                    if not isinstance(value, list):
                        return []
                    return [title for title in value if isinstance(title, str) and title in task_titles and title != task["title"]][:6]

                assignments.append({
                    "task_id": str(task["id"]),
                    "title": task["title"],
                    "assignee": assignee,
                    "estimated_hours": estimated_hours,
                    "priority": priority,
                    "ai_reason": ai_reason,
                    "depends_on": related_titles("depends_on"),
                    "blocks": related_titles("blocks"),
                })
            if assignments:
                time_range = phase.get("time_range")
                focus = phase.get("focus")
                phases.append({
                    "time_range": time_range.strip() if isinstance(time_range, str) and time_range.strip() else "Sprint block",
                    "focus": focus.strip() if isinstance(focus, str) and focus.strip() else "Complete planned work",
                    "tasks": assignments,
                })

        if not phases:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="OpenAI returned an incomplete sprint plan.")
        risk_level = response.get("risk_level")
        risk_level = risk_level if risk_level in {"low", "medium", "high"} else "medium"
        risk_reason = response.get("risk_reason")
        risk_reason = risk_reason.strip() if isinstance(risk_reason, str) and risk_reason.strip() else "The plan needs active monitoring as work progresses."
        try:
            completion_probability = max(0, min(100, int(response.get("completion_probability"))))
        except (TypeError, ValueError):
            completion_probability = 70
        recommendations = response.get("recommendations")
        recommendations = [item.strip() for item in recommendations if isinstance(item, str) and item.strip()][:5] if isinstance(recommendations, list) else []
        fallback_recommendations = [
            "Start critical-path work first and resolve blockers immediately.",
            "Check progress at the end of every sprint phase.",
            "Keep one team member available to unblock dependent work.",
        ]
        for recommendation in fallback_recommendations:
            if len(recommendations) >= 3:
                break
            recommendations.append(recommendation)
        return {
            "sprint_goal": response.get("sprint_goal").strip() if isinstance(response.get("sprint_goal"), str) and response.get("sprint_goal").strip() else project["title"],
            "risk_level": risk_level,
            "risk_reason": risk_reason,
            "completion_probability": completion_probability,
            "recommendations": recommendations,
            "phases": phases,
        }

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

    async def chat_about_dashboard(self, projects: list[dict], tasks: list[dict], message: str) -> str:
        completed_tasks = sum(task.get("status") == "completed" for task in tasks)
        in_progress = [task for task in tasks if task.get("status") == "in_progress"]
        open_tasks = [task for task in tasks if task.get("status") in {"todo", "in_progress"}]
        project_lines = "\n".join(
            f"- {project.get('title', 'Untitled project')} ({project.get('status', 'active')})"
            for project in projects[:20]
        ) or "- No projects yet"
        task_lines = "\n".join(
            f"- [{task.get('status', 'todo')}] {task.get('title', 'Untitled task')} "
            f"(project: {next((project.get('title') for project in projects if project.get('id') == task.get('project_id')), 'unknown')}; "
            f"difficulty: {task.get('difficulty', 'medium')}; estimate: {task.get('estimated_hours') or 'unspecified'}h)"
            for task in (in_progress + [task for task in open_tasks if task.get('status') != 'in_progress'])[:30]
        ) or "- No incomplete tasks yet"
        context = (
            f"Dashboard summary: {len(projects)} projects, {len(tasks)} total tasks, {completed_tasks} completed, "
            f"{len(in_progress)} in progress, {len(open_tasks)} incomplete.\n\nProjects:\n{project_lines}\n\n"
            f"Prioritized incomplete tasks:\n{task_lines}"
        )
        try:
            response = await self.client.chat.completions.create(
                model="gpt-5.6",
                messages=[
                    {"role": "system", "content": DASHBOARD_ASSISTANT_SYSTEM_PROMPT},
                    {"role": "user", "content": f"{context}\n\nUser question: {message}"},
                ],
            )
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"OpenAI API error: {str(exc)}")
        reply = response.choices[0].message.content
        if not reply:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="OpenAI returned an empty dashboard-assistant response.")
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

    async def match_teammates(
        self,
        project: dict,
        project_tasks: list[dict],
        candidates: list[dict],
    ) -> list[dict]:
        skill_tags = set()
        for t in project_tasks:
            for tag in (t.get("skill_tags") or []):
                skill_tags.add(tag)

        project_desc = (
            f"Project: {project['title']}\n"
            f"Goal: {project.get('goal') or project.get('description') or 'N/A'}\n"
            f"Required skills: {', '.join(skill_tags) if skill_tags else 'general'}\n"
            f"Tasks: {len(project_tasks)} total"
        )

        candidate_lines = []
        for c in candidates:
            candidate_lines.append(
                f"- ID: {c['id']} | Name: {c.get('full_name', 'Unknown')} | "
                f"Role: {c.get('team_role', 'other')} | Level: {c.get('experience_level', 'mid')} | "
                f"Skills: {', '.join(c.get('skills') or [])} | "
                f"Technologies: {', '.join(c.get('technologies') or [])} | "
                f"Preferences: {', '.join(c.get('work_preferences') or [])} | "
                f"Bio: {(c.get('bio') or '')[:200]}"
            )

        user_message = (
            f"{project_desc}\n\n"
            f"Available candidates:\n" + "\n".join(candidate_lines)
        )

        result = await self._json_completion(TEAM_MATCHING_SYSTEM_PROMPT, user_message)
        return result.get("matches") or []

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
