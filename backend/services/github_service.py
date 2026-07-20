import asyncio
import json
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from fastapi import HTTPException, status
from supabase import Client


class GitHubService:
    API_BASE = "https://api.github.com"

    def __init__(self, client: Client):
        self.client = client

    async def save_connection(self, user_id: str, provider_token: str) -> None:
        token = provider_token.strip()
        if not token:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A GitHub provider token is required.")
        self.client.table("github_connections").upsert(
            {"user_id": user_id, "access_token": token, "updated_at": datetime.now(timezone.utc).isoformat()},
            on_conflict="user_id",
        ).execute()

    async def list_repos(self, user_id: str) -> list[dict]:
        repos = await self._get(user_id, "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member")
        return [
            {
                "owner": item["owner"]["login"],
                "name": item["name"],
                "description": item.get("description"),
                "language": item.get("language"),
                "stars": item.get("stargazers_count", 0),
                "updated_at": item["updated_at"],
                "default_branch": item.get("default_branch") or "main",
                "private": item.get("private", False),
                "html_url": item["html_url"],
            }
            for item in repos
        ]

    async def list_branches(self, user_id: str, owner: str, repo: str) -> list[dict]:
        branches = await self._get(user_id, self._repo_path(owner, repo, "/branches?per_page=100"))
        return [{"name": branch["name"], "sha": branch["commit"]["sha"], "protected": branch.get("protected", False)} for branch in branches]

    async def list_commits(self, user_id: str, owner: str, repo: str) -> list[dict]:
        commits = await self._get(user_id, self._repo_path(owner, repo, "/commits?per_page=30"))
        return [
            {
                "sha": item["sha"],
                "message": item["commit"]["message"].split("\n", 1)[0],
                "author": (item.get("author") or {}).get("login") or item["commit"]["author"].get("name") or "Unknown",
                "authored_at": item["commit"]["author"].get("date"),
                "html_url": item["html_url"],
            }
            for item in commits
        ]

    async def list_pulls(self, user_id: str, owner: str, repo: str) -> list[dict]:
        pulls = await self._get(user_id, self._repo_path(owner, repo, "/pulls?state=open&per_page=30"))
        return [
            {
                "number": item["number"],
                "title": item["title"],
                "state": item["state"],
                "author": (item.get("user") or {}).get("login") or "Unknown",
                "updated_at": item["updated_at"],
                "html_url": item["html_url"],
                "head": item["head"]["ref"],
                "base": item["base"]["ref"],
            }
            for item in pulls
        ]

    async def list_issues(self, user_id: str, owner: str, repo: str) -> list[dict]:
        issues = await self._get(user_id, self._repo_path(owner, repo, "/issues?state=open&per_page=30"))
        return [
            {
                "number": item["number"],
                "title": item["title"],
                "state": item["state"],
                "author": (item.get("user") or {}).get("login") or "Unknown",
                "labels": [label["name"] for label in item.get("labels", [])],
                "updated_at": item["updated_at"],
                "html_url": item["html_url"],
            }
            for item in issues if "pull_request" not in item
        ]

    def _repo_path(self, owner: str, repo: str, suffix: str) -> str:
        return f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}{suffix}"

    async def _get(self, user_id: str, path: str):
        response = self.client.table("github_connections").select("access_token").eq("user_id", user_id).limit(1).execute()
        rows = response.data or []
        if not rows:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Connect GitHub by signing in with GitHub to use the workspace.")
        return await asyncio.to_thread(self._request, path, rows[0]["access_token"])

    def _request(self, path: str, token: str):
        request = Request(
            f"{self.API_BASE}{path}",
            headers={"Accept": "application/vnd.github+json", "Authorization": f"Bearer {token}", "User-Agent": "CoSkill-Workspace"},
        )
        try:
            with urlopen(request, timeout=15) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            if error.code in (401, 403):
                detail = "GitHub access expired or is unavailable. Sign in with GitHub again."
            elif error.code == 404:
                detail = "GitHub repository not found or access is denied."
            else:
                detail = "GitHub could not complete this request."
            raise HTTPException(status_code=error.code if error.code < 500 else status.HTTP_502_BAD_GATEWAY, detail=detail)
        except (URLError, TimeoutError) as error:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="GitHub is unavailable right now.") from error
