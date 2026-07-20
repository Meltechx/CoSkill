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

  const handleSelect = (username: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(`/profile/${username}`);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", padding: "0 10px", marginBottom: 6 }}>
      <div style={{ position: "relative" }}>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#8b949e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Type / to search"
          style={{
            width: "100%",
            padding: "8px 10px 8px 32px",
            borderRadius: 6,
            border: "1px solid #30363d",
            background: "#161b22",
            color: "#e6edf3",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {loading && (
          <div style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            width: 14, height: 14, borderRadius: "50%",
            border: "2px solid #30363d",
            borderTopColor: "#3fb950",
            animation: "spin 0.6s linear infinite",
          }} />
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute", left: 10, right: 10, top: "100%", marginTop: 4,
          background: "#161b22", border: "1px solid #30363d",
          borderRadius: 6, overflow: "hidden", zIndex: 100,
          boxShadow: "0 8px 24px rgba(1,4,9,.6)",
          maxHeight: 280, overflowY: "auto",
        }}>
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => user.username && handleSelect(user.username)}
              disabled={!user.username}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", border: "none", background: "transparent",
                color: "#e6edf3", cursor: "pointer", textAlign: "left",
                borderBottom: "1px solid #30363d",
                opacity: user.username ? 1 : 0.55,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#21262d"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: "#21262d",
                border: "1px solid #30363d",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "#8b949e",
              }}>
                {(user.full_name?.[0] || "?").toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.full_name || "Unknown"}
                </p>
                {user.username && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#58a6ff", fontWeight: 600 }}>@{user.username}</p>}
                <p style={{ margin: "1px 0 0", fontSize: 11, color: "#8b949e" }}>
                  {user.team_role} · {user.experience_level}
                </p>
              </div>
              {user.skills.length > 0 && (
                <span style={{
                  fontSize: 10, padding: "2px 6px", borderRadius: 5,
                  background: "rgba(46,160,67,.15)", border: "1px solid rgba(46,160,67,.4)",
                  color: "#3fb950", whiteSpace: "nowrap", flexShrink: 0,
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
