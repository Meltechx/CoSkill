"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import { Project, projects } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, loading } = useAuth();
  const [projectList, setProjectList] = useState<Project[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) { setProjectList([]); return; }
    const loadProjects = () => projects.list(token).then(setProjectList).catch(() => setProjectList([]));
    loadProjects();
    window.addEventListener("projects:changed", loadProjects);
    return () => window.removeEventListener("projects:changed", loadProjects);
  }, [pathname, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117" }}>
      <Navbar />
      <div className="dashboard-shell">
        <aside className="dashboard-left-panel" aria-label="Project navigation">
          <Link href="/dashboard/projects" className="dashboard-new-project">+ New project</Link>
          <p className="dashboard-panel-title">Your projects</p>
          <nav className="dashboard-panel-nav">
            {projectList.length === 0 && <span className="dashboard-empty-projects">No projects yet</span>}
            {projectList.map((project) => <Link key={project.id} href={`/dashboard/projects/${project.id}`} className={pathname === `/dashboard/projects/${project.id}` ? "dashboard-project-link active" : "dashboard-project-link"}><span>{project.title}</span><i className={`dashboard-status-badge ${project.status}`}>{project.status}</i></Link>)}
          </nav>
        </aside>
        <main className="dashboard-content">{children}</main>
        <aside className="dashboard-right-panel" aria-label="Workspace updates">
          <section className="dashboard-side-card"><h2>Notifications</h2><p>No new notifications.</p></section>
          <section className="dashboard-side-card"><h2>Workspace</h2><dl><div><dt>Focus</dt><dd>Build consistently</dd></div><div><dt>Tip</dt><dd>Complete a task to update your activity.</dd></div></dl></section>
        </aside>
      </div>
    </div>
  );
}
