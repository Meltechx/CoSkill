"use client";

import { useEffect, useState } from "react";

interface GitHubRepo {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics: string[];
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Java: "#b07219",
  "C#": "#178600",
  "C++": "#f34b7d",
  Go: "#00add8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Swift: "#f05138",
  Kotlin: "#a97bff",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
};

function githubUsername(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim().replace(/^@/, "");
  const match = normalized.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/i);
  const username = match?.[1] ?? normalized.split("/")[0];
  return /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username) ? username : null;
}

function relativeTime(isoDate: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const units: Array<[number, string]> = [[31536000, "year"], [2592000, "month"], [604800, "week"], [86400, "day"], [3600, "hour"], [60, "minute"]];
  const [amount, unit] = units.find(([threshold]) => seconds >= threshold) || [60, "minute"];
  const value = Math.floor(seconds / amount);
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

export function GitHubRepos({ githubUrl }: { githubUrl: string | null | undefined }) {
  const username = githubUsername(githubUrl);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!username) return;
    const controller = new AbortController();
    setStatus("loading");
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=6`, { signal: controller.signal, headers: { Accept: "application/vnd.github+json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("GitHub repositories could not be loaded.");
        return response.json() as Promise<GitHubRepo[]>;
      })
      .then((data) => {
        setRepos(data);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [username]);

  if (!username) return null;

  return (
    <section style={{ marginBottom: 20 }} aria-labelledby="github-repositories-heading">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <div>
          <h2 id="github-repositories-heading" style={{ margin: 0, fontSize: 17, color: "#e6edf3" }}>GitHub repositories</h2>
          <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: 12 }}>@{username} · recently updated</p>
        </div>
        <a href={`https://github.com/${username}`} target="_blank" rel="noreferrer" style={{ color: "#58a6ff", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>View GitHub ↗</a>
      </div>

      {status === "loading" && <p style={{ margin: 0, color: "#8b949e", fontSize: 13 }}>Loading repositories…</p>}
      {status === "error" && <p style={{ margin: 0, color: "#8b949e", fontSize: 13 }}>GitHub repositories are unavailable right now.</p>}
      {status === "ready" && (repos.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          {repos.map((repo) => {
            const language = repo.language || "Unknown";
            return (
              <article key={repo.id} style={{ minWidth: 0, padding: 16, borderRadius: 10, background: "#161b22", border: "1px solid #30363d" }}>
                <a href={repo.html_url} target="_blank" rel="noreferrer" style={{ display: "block", overflow: "hidden", color: "#58a6ff", fontWeight: 700, textDecoration: "none", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{repo.name}</a>
                <p style={{ height: 36, overflow: "hidden", margin: "8px 0 14px", color: "#8b949e", fontSize: 12, lineHeight: 1.5 }}>{repo.description || "No description provided."}</p>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, color: "#8b949e", fontSize: 11 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 7px", borderRadius: 999, background: "rgba(110,118,129,.2)", border: "1px solid rgba(240,246,252,.1)" }}><i style={{ width: 9, height: 9, borderRadius: "50%", background: LANGUAGE_COLORS[language] || "#8b949e" }} />{language}</span>
                  <span>⭐ {repo.stargazers_count}</span>
                  <span>🍴 {repo.forks_count}</span>
                </div>
                <p style={{ margin: "12px 0 0", color: "#8b949e", fontSize: 11 }}>Updated {relativeTime(repo.updated_at)}</p>
                {repo.topics?.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                  {repo.topics.map((topic) => <span key={topic} style={{ padding: "3px 7px", borderRadius: 999, background: "rgba(56,139,253,.12)", border: "1px solid rgba(56,139,253,.25)", color: "#79c0ff", fontSize: 10, lineHeight: 1.2 }}>{topic}</span>)}
                </div>}
              </article>
            );
          })}
        </div>
      ) : <p style={{ margin: 0, color: "#8b949e", fontSize: 13 }}>No public repositories found.</p>)}
    </section>
  );
}
