"use client";

import { useEffect, useState } from "react";
import { auth, GitHubBranch, GitHubCommit, GitHubIssue, GitHubPull, GitHubRepo, github } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "branches" | "commits" | "pulls" | "issues";

function relativeTime(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const units: Array<[number, string]> = [[86400, "day"], [3600, "hour"], [60, "minute"]];
  if (seconds < 60) return "just now";
  const [amount, label] = units.find(([amount]) => seconds >= amount) || [60, "minute"];
  const value = Math.floor(seconds / amount);
  return `${value} ${label}${value === 1 ? "" : "s"} ago`;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", placeItems: "center", minHeight: 220, padding: 24, border: "1px dashed #30363d", borderRadius: 8, color: "#8b949e", fontSize: 13, textAlign: "center" }}>{children}</div>;
}

export default function WorkspacePage() {
  const { token } = useAuth();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selected, setSelected] = useState<GitHubRepo | null>(null);
  const [tab, setTab] = useState<Tab>("commits");
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [pulls, setPulls] = useState<GitHubPull[]>([]);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoadingRepos(true);
    setError("");
    github.repos(token)
      .then((items) => { setRepos(items); setSelected(items[0] || null); })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "GitHub repositories could not be loaded."))
      .finally(() => setLoadingRepos(false));
  }, [token]);

  useEffect(() => {
    if (!token || !selected) return;
    setLoadingDetails(true);
    setError("");
    const load = tab === "branches" ? github.branches(selected.owner, selected.name, token)
      : tab === "commits" ? github.commits(selected.owner, selected.name, token)
      : tab === "pulls" ? github.pulls(selected.owner, selected.name, token)
      : github.issues(selected.owner, selected.name, token);
    load.then((items) => {
      if (tab === "branches") setBranches(items as GitHubBranch[]);
      if (tab === "commits") setCommits(items as GitHubCommit[]);
      if (tab === "pulls") setPulls(items as GitHubPull[]);
      if (tab === "issues") setIssues(items as GitHubIssue[]);
    }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "GitHub details could not be loaded."))
      .finally(() => setLoadingDetails(false));
  }, [selected, tab, token]);

  const connectGitHub = async () => {
    try { window.location.assign((await auth.githubUrl()).url); }
    catch (connectError) { setError(connectError instanceof Error ? connectError.message : "GitHub sign-in is unavailable."); }
  };

  const renderTab = () => {
    if (loadingDetails) return <EmptyState>Loading {tab}…</EmptyState>;
    if (tab === "branches") return branches.length ? <div style={{ display: "grid", gap: 8 }}>{branches.map((branch) => <div key={branch.name} style={rowStyle}><strong style={{ color: "#58a6ff" }}>⑂ {branch.name}</strong><span style={mutedStyle}>{branch.sha.slice(0, 7)} {branch.protected ? "· protected" : ""}</span></div>)}</div> : <EmptyState>No branches found.</EmptyState>;
    if (tab === "commits") return commits.length ? <div style={{ display: "grid", gap: 8 }}>{commits.map((commit) => <a key={commit.sha} href={commit.html_url} target="_blank" rel="noreferrer" style={{ ...rowStyle, textDecoration: "none" }}><strong style={{ color: "#e6edf3" }}>{commit.message}</strong><span style={mutedStyle}>{commit.author} · {commit.sha.slice(0, 7)} · {commit.authored_at ? relativeTime(commit.authored_at) : ""}</span></a>)}</div> : <EmptyState>No commits found.</EmptyState>;
    if (tab === "pulls") return pulls.length ? <div style={{ display: "grid", gap: 8 }}>{pulls.map((pull) => <a key={pull.number} href={pull.html_url} target="_blank" rel="noreferrer" style={{ ...rowStyle, textDecoration: "none" }}><strong style={{ color: "#e6edf3" }}><span style={{ color: "#3fb950" }}>◉</span> #{pull.number} {pull.title}</strong><span style={mutedStyle}>{pull.author} · {pull.head} → {pull.base} · {relativeTime(pull.updated_at)}</span></a>)}</div> : <EmptyState>No open pull requests.</EmptyState>;
    return issues.length ? <div style={{ display: "grid", gap: 8 }}>{issues.map((issue) => <a key={issue.number} href={issue.html_url} target="_blank" rel="noreferrer" style={{ ...rowStyle, textDecoration: "none" }}><strong style={{ color: "#e6edf3" }}><span style={{ color: "#a371f7" }}>◉</span> #{issue.number} {issue.title}</strong><span style={{ ...mutedStyle, display: "flex", flexWrap: "wrap", gap: 6 }}>{issue.author} · {relativeTime(issue.updated_at)}{issue.labels.map((label) => <i key={label} style={{ padding: "2px 6px", borderRadius: 99, background: "rgba(56,139,253,.16)", color: "#79c0ff", fontStyle: "normal" }}>{label}</i>)}</span></a>)}</div> : <EmptyState>No open issues.</EmptyState>;
  };

  return <div style={{ padding: "32px", color: "#e6edf3", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
    <header style={{ marginBottom: 24 }}>
      <p style={{ margin: "0 0 5px", color: "#58a6ff", fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>GitHub Workspace</p>
      <h1 style={{ margin: 0, fontSize: 26, letterSpacing: "-.04em" }}>Your repositories</h1>
    </header>

    {error && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 14px", marginBottom: 18, borderRadius: 8, border: "1px solid rgba(248,81,73,.35)", background: "rgba(248,81,73,.08)", color: "#ffa198", fontSize: 13 }}><span>{error}</span>{error.includes("Connect GitHub") && <button type="button" onClick={connectGitHub} style={{ padding: "7px 10px", border: "1px solid #444c56", borderRadius: 6, background: "#21262d", color: "#f0f6fc", cursor: "pointer", fontWeight: 600 }}>Connect GitHub</button>}</div>}

    <div style={{ display: "grid", gridTemplateColumns: "minmax(185px, .55fr) minmax(0, 1.45fr)", minHeight: 520, overflow: "hidden", border: "1px solid #30363d", borderRadius: 10, background: "#0d1117" }}>
      <aside style={{ borderRight: "1px solid #30363d", background: "#161b22" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #30363d", color: "#8b949e", fontSize: 12, fontWeight: 700 }}>REPOSITORIES</div>
        {loadingRepos ? <p style={{ padding: 16, color: "#8b949e", fontSize: 13 }}>Loading…</p> : repos.length ? <nav style={{ padding: 8 }}>{repos.map((repo) => <button key={`${repo.owner}/${repo.name}`} type="button" onClick={() => setSelected(repo)} style={{ width: "100%", padding: "10px 11px", border: "1px solid", borderColor: selected?.html_url === repo.html_url ? "#1f6feb" : "transparent", borderRadius: 6, background: selected?.html_url === repo.html_url ? "rgba(31,111,235,.15)" : "transparent", color: selected?.html_url === repo.html_url ? "#79c0ff" : "#c9d1d9", cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{repo.private ? "◒ " : "◌ "}{repo.name}</button>)}</nav> : <p style={{ padding: 16, color: "#8b949e", fontSize: 13 }}>No repositories found.</p>}
      </aside>

      <section style={{ minWidth: 0, padding: 24 }}>
        {selected ? <>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
            <div><a href={selected.html_url} target="_blank" rel="noreferrer" style={{ color: "#58a6ff", fontSize: 20, fontWeight: 700, textDecoration: "none" }}>{selected.owner}/{selected.name} ↗</a><p style={{ margin: "8px 0 0", color: "#8b949e", fontSize: 13 }}>{selected.description || "No description provided."}</p></div>
            <span style={{ padding: "4px 8px", border: "1px solid #30363d", borderRadius: 99, color: "#8b949e", fontSize: 11 }}>{selected.private ? "Private" : "Public"}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20, color: "#8b949e", fontSize: 12 }}><span>⑂ {selected.default_branch}</span><span>★ {selected.stars}</span><span>{selected.language || "No language"}</span><span>Updated {relativeTime(selected.updated_at)}</span></div>
          <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #30363d" }}>{(["branches", "commits", "pulls", "issues"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} style={{ padding: "10px 12px", border: 0, borderBottom: `2px solid ${tab === item ? "#f78166" : "transparent"}`, background: "transparent", color: tab === item ? "#e6edf3" : "#8b949e", cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{item === "pulls" ? "Pull requests" : item}</button>)}</div>
          {renderTab()}
        </> : <EmptyState>Select a repository to view its workspace.</EmptyState>}
      </section>
    </div>
  </div>;
}

const rowStyle = { display: "grid", gap: 5, padding: "12px 14px", border: "1px solid #30363d", borderRadius: 7, background: "#161b22", fontSize: 13 };
const mutedStyle = { color: "#8b949e", fontSize: 12 };
