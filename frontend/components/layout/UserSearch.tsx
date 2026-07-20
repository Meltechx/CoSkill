"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { users, UserSearchResult } from "@/lib/api";

export default function UserSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      users
        .search(query.trim())
        .then((data) => {
          setResults(data);
          setOpen(data.length > 0);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (userId: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(`/profile/${userId}`);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", padding: "0 10px", marginBottom: 6 }}>
      <div style={{ position: "relative" }}>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Find users..."
          style={{
            width: "100%",
            padding: "8px 10px 8px 32px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.03)",
            color: "white",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {loading && (
          <div style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            width: 14, height: 14, borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.1)",
            borderTopColor: "#a855f7",
            animation: "spin 0.6s linear infinite",
          }} />
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute", left: 10, right: 10, top: "100%", marginTop: 4,
          background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, overflow: "hidden", zIndex: 100,
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          maxHeight: 280, overflowY: "auto",
        }}>
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelect(user.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", border: "none", background: "transparent",
                color: "white", cursor: "pointer", textAlign: "left",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.2))",
                border: "1px solid rgba(168,85,247,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "#c084fc",
              }}>
                {(user.full_name?.[0] || "?").toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.full_name || "Unknown"}
                </p>
                <p style={{ margin: "1px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                  {user.team_role} · {user.experience_level}
                </p>
              </div>
              {user.skills.length > 0 && (
                <span style={{
                  fontSize: 10, padding: "2px 6px", borderRadius: 5,
                  background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.15)",
                  color: "#86efac", whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {user.skills[0]}{user.skills.length > 1 ? ` +${user.skills.length - 1}` : ""}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
      `}</style>
    </div>
  );
}
