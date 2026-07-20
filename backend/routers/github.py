from fastapi import APIRouter, Depends, status

from database import supabase_admin
from dependencies import get_current_user
from models.github import GitHubBranchOut, GitHubCommitOut, GitHubConnectionIn, GitHubIssueOut, GitHubPullOut, GitHubRepoOut
from services.github_service import GitHubService

router = APIRouter()


def get_github_service() -> GitHubService:
    return GitHubService(supabase_admin)


@router.post("/connect", status_code=status.HTTP_204_NO_CONTENT)
async def connect_github(
    body: GitHubConnectionIn,
    current_user=Depends(get_current_user),
    github_service: GitHubService = Depends(get_github_service),
):
    await github_service.save_connection(str(current_user.id), body.provider_token)


@router.get("/repos", response_model=list[GitHubRepoOut])
async def list_repos(current_user=Depends(get_current_user), github_service: GitHubService = Depends(get_github_service)):
    return await github_service.list_repos(str(current_user.id))


@router.get("/repos/{owner}/{repo}/branches", response_model=list[GitHubBranchOut])
async def list_branches(owner: str, repo: str, current_user=Depends(get_current_user), github_service: GitHubService = Depends(get_github_service)):
    return await github_service.list_branches(str(current_user.id), owner, repo)


@router.get("/repos/{owner}/{repo}/commits", response_model=list[GitHubCommitOut])
async def list_commits(owner: str, repo: str, current_user=Depends(get_current_user), github_service: GitHubService = Depends(get_github_service)):
    return await github_service.list_commits(str(current_user.id), owner, repo)


@router.get("/repos/{owner}/{repo}/pulls", response_model=list[GitHubPullOut])
async def list_pulls(owner: str, repo: str, current_user=Depends(get_current_user), github_service: GitHubService = Depends(get_github_service)):
    return await github_service.list_pulls(str(current_user.id), owner, repo)


@router.get("/repos/{owner}/{repo}/issues", response_model=list[GitHubIssueOut])
async def list_issues(owner: str, repo: str, current_user=Depends(get_current_user), github_service: GitHubService = Depends(get_github_service)):
    return await github_service.list_issues(str(current_user.id), owner, repo)
