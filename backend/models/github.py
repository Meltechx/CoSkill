from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class GitHubConnectionIn(BaseModel):
    provider_token: str


class GitHubRepoOut(BaseModel):
    owner: str
    name: str
    description: Optional[str] = None
    language: Optional[str] = None
    stars: int
    updated_at: datetime
    default_branch: str
    private: bool
    html_url: str


class GitHubBranchOut(BaseModel):
    name: str
    sha: str
    protected: bool


class GitHubCommitOut(BaseModel):
    sha: str
    message: str
    author: str
    authored_at: Optional[datetime] = None
    html_url: str


class GitHubPullOut(BaseModel):
    number: int
    title: str
    state: str
    author: str
    updated_at: datetime
    html_url: str
    head: str
    base: str


class GitHubIssueOut(BaseModel):
    number: int
    title: str
    state: str
    author: str
    labels: list[str] = []
    updated_at: datetime
    html_url: str
