"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TeamProfileUpdate, users } from "@/lib/api";

const TECHNOLOGIES = ["React", "Next.js", "TypeScript", "Python", "FastAPI", "Node.js", "PostgreSQL", "Supabase", "OpenAI", "Figma"];
const PREFERENCES = ["Remote", "Hackathon", "Startup"];
const STEPS = ["Tell us about yourself", "Your skills", "Work preferences"];
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken" | "error";

function TagEditor({ tags, onChange, placeholder }: { tags: string[]; onChange: (tags: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const addTags = (value: string) => {
    const next = value.split(",").map((item) => item.trim()).filter(Boolean);
    if (next.length) onChange(Array.from(new Set([...tags, ...next])));
    setDraft("");
  };

  return <div style={{ minHeight: 48, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7, padding: "8px 10px", borderRadius: 11, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.1)" }}>{tags.map((tag) => <button key={tag} type="button" onClick={() => onChange(tags.filter((item) => item !== tag))} style={{ padding: "4px 8px", border: 0, borderRadius: 999, background: "rgba(168,85,247,.18)", color: "#e9d5ff", fontSize: 11, cursor: "pointer" }}>{tag} ×</button>)}<input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTags(draft); } }} onBlur={() => addTags(draft)} placeholder={placeholder} style={{ flex: 1, minWidth: 150, border: 0, outline: 0, color: "white", background: "transparent", fontSize: 13 }} /></div>;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TeamProfileUpdate>({ username: "", bio: "", skills: [], technologies: [], experience_level: "mid", github_url: "", linkedin_url: "", work_preferences: [], team_role: "other", is_available: true });
  const [existingUsername, setExistingUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.replace("/login"); return; }
    users.teamProfile(token).then((profile) => {
      const username = profile.username || "";
      setExistingUsername(username);
      setForm({ username, bio: profile.bio || "", skills: profile.skills, technologies: profile.technologies, experience_level: profile.experience_level, github_url: profile.github_url || "", linkedin_url: profile.linkedin_url || "", work_preferences: profile.work_preferences, team_role: profile.team_role, is_available: profile.is_available });
    }).catch(() => {}).finally(() => setLoadingProfile(false));
  }, [authLoading, router, token]);

  useEffect(() => {
    const username = form.username || "";
    if (!username) { setUsernameStatus("idle"); return; }
    if (!USERNAME_PATTERN.test(username)) { setUsernameStatus("invalid"); return; }
    if (username === existingUsername) { setUsernameStatus("available"); return; }

    let cancelled = false;
    setUsernameStatus("checking");
    const timeout = window.setTimeout(() => {
      users.checkUsername(username)
        .then(({ available }) => { if (!cancelled) setUsernameStatus(available ? "available" : "taken"); })
        .catch(() => { if (!cancelled) setUsernameStatus("error"); });
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [existingUsername, form.username]);

  const progress = useMemo(() => `${((step + 1) / STEPS.length) * 100}%`, [step]);
  const update = <K extends keyof TeamProfileUpdate>(key: K, value: TeamProfileUpdate[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateUsername = (value: string) => update("username", value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20));
  const next = () => {
    if (step === 0 && usernameStatus !== "available") {
      setError("Choose an available username before continuing.");
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };
  const skip = () => step === STEPS.length - 1 ? router.replace("/dashboard") : next();
  const complete = async () => {
    if (!token || saving) return;
    if (usernameStatus !== "available") { setError("Choose an available username before completing setup."); setStep(0); return; }
    setSaving(true); setError("");
    try { await users.updateTeamProfile(form, token); router.replace("/dashboard"); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save your profile."); }
    finally { setSaving(false); }
  };

  if (authLoading || loadingProfile) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#080808", color: "rgba(255,255,255,.5)" }}>Preparing your profile…</main>;

  const labelStyle = { display: "block", marginBottom: 7, color: "rgba(255,255,255,.6)", fontSize: 12, fontWeight: 700 };
  const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: "11px 12px", borderRadius: 11, outline: 0, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.1)", color: "white", fontSize: 13 };
  const usernameMessage = usernameStatus === "available" ? "Username is available" : usernameStatus === "taken" ? "Username is already taken" : usernameStatus === "invalid" ? "Use 3–20 letters, numbers, or underscores" : usernameStatus === "error" ? "Could not check availability" : "";
  const statusColor = usernameStatus === "available" ? "#86efac" : "#fca5a5";

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "radial-gradient(circle at 12% 0, rgba(168,85,247,.2), transparent 28%), radial-gradient(circle at 90% 90%, rgba(59,130,246,.14), transparent 35%), #080808", color: "white" }}><section style={{ width: "100%", maxWidth: 660, padding: "30px", borderRadius: 22, background: "rgba(18,18,22,.82)", border: "1px solid rgba(255,255,255,.09)", boxShadow: "0 30px 90px rgba(0,0,0,.45)", backdropFilter: "blur(22px)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}><div><p style={{ margin: 0, color: "#c084fc", fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>CoSkill profile</p><h1 style={{ margin: "6px 0 0", fontSize: 25, letterSpacing: "-.04em" }}>{STEPS[step]}</h1></div><span style={{ color: "rgba(255,255,255,.45)", fontSize: 12, fontWeight: 700 }}>Step {step + 1} of 3</span></div><div style={{ height: 6, marginBottom: 28, overflow: "hidden", borderRadius: 999, background: "rgba(255,255,255,.08)" }}><div style={{ width: progress, height: "100%", borderRadius: "inherit", background: "linear-gradient(90deg,#a855f7,#3b82f6)", boxShadow: "0 0 15px rgba(168,85,247,.6)", transition: "width .45s ease" }} /></div>{step === 0 && <div style={{ display: "grid", gap: 18 }}><div><label style={labelStyle} htmlFor="username">Username</label><div style={{ position: "relative" }}><input id="username" value={form.username || ""} onChange={(event) => updateUsername(event.target.value)} placeholder="your_username" autoComplete="username" aria-describedby="username-help" aria-invalid={usernameStatus === "invalid" || usernameStatus === "taken"} style={{ ...inputStyle, paddingRight: 42, borderColor: usernameStatus === "available" ? "rgba(74,222,128,.65)" : usernameStatus === "invalid" || usernameStatus === "taken" || usernameStatus === "error" ? "rgba(248,113,113,.65)" : "rgba(255,255,255,.1)" }} />{usernameStatus === "checking" && <span aria-label="Checking username" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,.55)", fontSize: 14 }}>…</span>}{usernameStatus === "available" && <span aria-label="Username available" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#4ade80", fontWeight: 900 }}>✓</span>}{["invalid", "taken", "error"].includes(usernameStatus) && <span aria-label="Username unavailable" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#f87171", fontWeight: 900 }}>✕</span>}</div><p id="username-help" style={{ margin: "6px 0 0", color: usernameMessage ? statusColor : "rgba(255,255,255,.38)", fontSize: 11 }}>{usernameMessage || "3–20 characters: letters, numbers, and underscores only."}</p></div><div><label style={labelStyle}>Short bio</label><textarea value={form.bio || ""} onChange={(event) => update("bio", event.target.value)} placeholder="What do you enjoy building?" rows={4} style={{ ...inputStyle, resize: "vertical" }} /></div><div><label style={labelStyle}>Role</label><select value={form.team_role || "other"} onChange={(event) => update("team_role", event.target.value)} style={inputStyle}>{["backend", "frontend", "mobile", "designer", "ai-ml", "devops", "other"].map((role) => <option key={role} value={role}>{role === "ai-ml" ? "AI / ML" : role[0].toUpperCase() + role.slice(1)}</option>)}</select></div><div><label style={labelStyle}>Experience level</label><div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>{["junior", "mid", "senior", "lead"].map((level) => <button key={level} type="button" onClick={() => update("experience_level", level)} style={{ padding: "9px 6px", borderRadius: 10, cursor: "pointer", border: `1px solid ${form.experience_level === level ? "#a855f7" : "rgba(255,255,255,.09)"}`, background: form.experience_level === level ? "rgba(168,85,247,.17)" : "rgba(255,255,255,.025)", color: form.experience_level === level ? "#e9d5ff" : "rgba(255,255,255,.6)", fontSize: 12, textTransform: "capitalize" }}>{level}</button>)}</div></div></div>}{step === 1 && <div style={{ display: "grid", gap: 20 }}><div><label style={labelStyle}>Skills</label><TagEditor tags={form.skills || []} onChange={(skills) => update("skills", skills)} placeholder="Type a skill, then press Enter" /></div><div><label style={labelStyle}>Technologies</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{TECHNOLOGIES.map((technology) => { const selected = (form.technologies || []).includes(technology); return <button key={technology} type="button" onClick={() => update("technologies", selected ? (form.technologies || []).filter((item) => item !== technology) : [...(form.technologies || []), technology])} style={{ padding: "8px 10px", borderRadius: 999, cursor: "pointer", border: `1px solid ${selected ? "rgba(59,130,246,.55)" : "rgba(255,255,255,.09)"}`, background: selected ? "rgba(59,130,246,.15)" : "rgba(255,255,255,.025)", color: selected ? "#bfdbfe" : "rgba(255,255,255,.55)", fontSize: 12 }}>{technology}</button>; })}</div></div></div>}{step === 2 && <div style={{ display: "grid", gap: 20 }}><div><label style={labelStyle}>What kind of work fits you?</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{PREFERENCES.map((preference) => { const selected = (form.work_preferences || []).includes(preference.toLowerCase()); return <label key={preference} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderRadius: 10, background: selected ? "rgba(168,85,247,.13)" : "rgba(255,255,255,.025)", border: `1px solid ${selected ? "rgba(168,85,247,.4)" : "rgba(255,255,255,.08)"}`, color: "rgba(255,255,255,.72)", fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={selected} onChange={() => update("work_preferences", selected ? (form.work_preferences || []).filter((item) => item !== preference.toLowerCase()) : [...(form.work_preferences || []), preference.toLowerCase()])} />{preference}</label>; })}</div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><div><label style={labelStyle}>GitHub URL</label><input value={form.github_url || ""} onChange={(event) => update("github_url", event.target.value)} placeholder="github.com/you" style={inputStyle} /></div><div><label style={labelStyle}>LinkedIn URL</label><input value={form.linkedin_url || ""} onChange={(event) => update("linkedin_url", event.target.value)} placeholder="linkedin.com/in/you" style={inputStyle} /></div></div></div>}{error && <p style={{ margin: "20px 0 0", color: "#fca5a5", fontSize: 13 }}>{error}</p>}<footer style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 30 }}><button type="button" onClick={skip} style={{ border: 0, background: "transparent", color: "rgba(255,255,255,.45)", cursor: "pointer", fontSize: 13 }}>Skip for now</button><div style={{ display: "flex", gap: 8 }}>{step > 0 && <button type="button" onClick={() => setStep((current) => current - 1)} style={{ padding: "10px 14px", borderRadius: 10, cursor: "pointer", border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: "rgba(255,255,255,.75)" }}>Back</button>}<button type="button" onClick={step === STEPS.length - 1 ? complete : next} disabled={saving} style={{ padding: "10px 16px", border: 0, borderRadius: 10, cursor: saving ? "wait" : "pointer", background: "linear-gradient(135deg,#a855f7,#3b82f6)", color: "white", fontWeight: 800, boxShadow: "0 8px 22px rgba(59,130,246,.25)" }}>{saving ? "Saving…" : step === STEPS.length - 1 ? "Complete Setup" : "Continue"}</button></div></footer></section></main>;
}
