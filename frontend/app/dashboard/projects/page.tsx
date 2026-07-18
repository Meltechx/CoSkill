"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { projects as projectsApi, Project } from "@/lib/api";
import ProjectCard from "@/components/dashboard/ProjectCard";
import CreateProjectModal from "@/components/dashboard/CreateProjectModal";

export default function ProjectsPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    projectsApi.list(token).then(setProjects).catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects.")).finally(() => setLoading(false));
  }, [token]);

  const createProject = async (data: { title: string; goal: string; deadline?: string }) => {
    if (!token) return;
    const project = await projectsApi.create(data, token);
    setProjects((items) => [project, ...items]);
  };

  return (
    <div style={{ minHeight: "100vh", padding: "40px", background: "#080808", color: "white" }}>
      <div style={{ maxWidth: 1080 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start", marginBottom: 32 }}>
          <div><p style={{ margin: 0, color: "#c084fc", fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>Workspace</p><h1 style={{ margin: "5px 0 6px", fontSize: 26, letterSpacing: "-.04em" }}>Projects</h1><p style={{ margin: 0, color: "rgba(255,255,255,.42)", fontSize: 14 }}>Plan, track, and review all of your work.</p></div>
          <button onClick={() => setCreateOpen(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", border: 0, borderRadius: 10, background: "linear-gradient(135deg, #a855f7, #3b82f6)", color: "white", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}><span style={{ fontSize: 18, lineHeight: .7 }}>+</span> New project</button>
        </div>

        {error && <div style={{ marginBottom: 20, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,.25)", background: "rgba(239,68,68,.08)", color: "#fca5a5", fontSize: 13 }}>{error}</div>}
        {loading ? <p style={{ color: "rgba(255,255,255,.45)" }}>Loading projects…</p> : projects.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>{projects.map((project) => <ProjectCard key={project.id} project={project} onDeleted={(id) => setProjects((items) => items.filter((item) => item.id !== id))} />)}</div>
        ) : (
          <div style={{ padding: "62px 24px", borderRadius: 16, textAlign: "center", background: "rgba(255,255,255,.025)", border: "1px dashed rgba(255,255,255,.12)" }}><h2 style={{ margin: 0, fontSize: 17 }}>Start your first project</h2><p style={{ color: "rgba(255,255,255,.42)", fontSize: 14 }}>Create a goal and let CoSkill turn it into a focused plan.</p><button onClick={() => setCreateOpen(true)} style={{ marginTop: 8, padding: "10px 16px", border: 0, borderRadius: 9, background: "rgba(168,85,247,.18)", color: "#d8b4fe", fontWeight: 700, cursor: "pointer" }}>Create project</button></div>
        )}
      </div>
      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createProject} />
    </div>
  );
}
