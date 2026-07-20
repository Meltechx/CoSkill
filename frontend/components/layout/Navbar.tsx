"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import JudgeMode from "@/components/dashboard/JudgeMode";
import UserSearch from "@/components/layout/UserSearch";

const menuItems = [
  ["Hackathons", "/dashboard/hackathons"],
  ["Projects", "/dashboard/projects"],
  ["Performance", "/dashboard/performance"],
  ["Insights", "/dashboard/insights"],
  ["Achievements", "/dashboard/gamification"],
] as const;

function MenuLinks({ onNavigate }: { onNavigate?: () => void }) {
  return <>{menuItems.map(([label, href]) => <Link key={href} href={href} onClick={onNavigate} className="nav-menu-link">{label}</Link>)}</>;
}

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const initials = (user?.full_name || user?.email || "?").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  return <>
    <header className="top-navbar">
      <div className="nav-left">
        <Link href="/dashboard" className="nav-brand" aria-label="CoSkill dashboard">
          <span className="nav-logo-mark">C</span><span>CoSkill</span>
        </Link>
      </div>

      <div className="nav-search"><UserSearch /></div>

      <div className="nav-actions">
        <div className="judge-control"><JudgeMode /></div>
        <button type="button" className="nav-icon-button" aria-label="Notifications" title="Notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        </button>
        <div ref={accountRef} className="account-menu-wrap">
          <button type="button" className="avatar-button" onClick={() => setAccountOpen((open) => !open)} aria-haspopup="menu" aria-expanded={accountOpen} aria-label="Open account menu">
            {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initials}
          </button>
          {accountOpen && <div role="menu" className="account-menu">
            <div className="account-menu-user"><strong>{user?.full_name || "CoSkill member"}</strong><span>{user?.email}</span></div>
            <div className="menu-divider" />
            <MenuLinks onNavigate={() => setAccountOpen(false)} />
            <div className="menu-divider" />
            <button type="button" className="nav-menu-link signout" onClick={signOut}>Sign out</button>
          </div>}
        </div>
      </div>

      <div className="mobile-actions">
        <button type="button" className="nav-icon-button" aria-label="Notifications" title="Notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        </button>
        <button type="button" className="hamburger-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu">
          <span /><span /><span />
        </button>
      </div>
    </header>

    {mobileOpen && <div className="mobile-menu-overlay" onClick={() => setMobileOpen(false)}>
      <aside className="mobile-menu" onClick={(event) => event.stopPropagation()} aria-label="Navigation menu">
        <div className="mobile-menu-header"><strong>Menu</strong><button type="button" className="nav-icon-button" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu">×</button></div>
        <div className="mobile-search"><UserSearch /></div>
        <nav className="mobile-links"><MenuLinks onNavigate={() => setMobileOpen(false)} /></nav>
        <div className="mobile-judge"><JudgeMode /></div>
        <button type="button" className="mobile-signout" onClick={signOut}>Sign out</button>
      </aside>
    </div>}

    <style jsx>{`
      .top-navbar { position: fixed; inset: 0 0 auto; height: 64px; display: grid; grid-template-columns: 1fr minmax(260px, 480px) 1fr; align-items: center; gap: 20px; padding: 0 24px; background: #161b22; border-bottom: 1px solid #30363d; color: #e6edf3; z-index: 40; }
      .nav-left { display: flex; align-items: center; }.nav-brand { display: inline-flex; align-items: center; gap: 8px; color: #e6edf3; font-size: 16px; font-weight: 600; text-decoration: none; }.nav-logo-mark { display: grid; place-items: center; width: 28px; height: 28px; background: #238636; border-radius: 6px; color: white; font-size: 13px; font-weight: 800; }
      .nav-search :global(> div) { margin: 0; padding: 0; }.nav-actions { display: flex; justify-content: flex-end; align-items: center; gap: 10px; }.judge-control { width: auto; }.nav-icon-button, .avatar-button, .hamburger-button { display: grid; place-items: center; border: 1px solid #30363d; background: #21262d; color: #8b949e; cursor: pointer; }.nav-icon-button { width: 32px; height: 32px; border-radius: 6px; }.nav-icon-button:hover, .hamburger-button:hover { color: #e6edf3; background: #30363d; }
      .account-menu-wrap { position: relative; }.avatar-button { width: 32px; height: 32px; overflow: hidden; border-radius: 50%; color: #e6edf3; font-size: 12px; font-weight: 700; }.avatar-button img { width: 100%; height: 100%; object-fit: cover; }.avatar-button:hover { border-color: #8b949e; }
      .account-menu { position: absolute; right: 0; top: calc(100% + 8px); width: 230px; padding: 6px; background: #161b22; border: 1px solid #30363d; border-radius: 6px; box-shadow: 0 8px 24px rgba(1,4,9,.6); }.account-menu-user { display: grid; gap: 3px; padding: 8px 10px; font-size: 12px; }.account-menu-user strong { color: #e6edf3; font-weight: 600; }.account-menu-user span { color: #8b949e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.menu-divider { height: 1px; margin: 6px -6px; background: #30363d; }
      :global(.nav-menu-link) { display: block; width: 100%; padding: 7px 10px; border: 0; border-radius: 4px; background: transparent; color: #e6edf3; font: inherit; font-size: 13px; text-align: left; text-decoration: none; cursor: pointer; box-sizing: border-box; }:global(.nav-menu-link:hover) { background: #21262d; }:global(.nav-menu-link.signout) { color: #f85149; }
      .mobile-actions, .mobile-menu-overlay { display: none; }
      @media (max-width: 760px) { .top-navbar { height: 56px; display: flex; justify-content: space-between; padding: 0 16px; }.nav-search, .nav-actions { display: none; }.mobile-actions { display: flex; align-items: center; gap: 8px; }.hamburger-button { width: 36px; height: 32px; border-radius: 6px; gap: 4px; }.hamburger-button span { display: block; width: 15px; height: 1.5px; background: currentColor; }.mobile-menu-overlay { display: block; position: fixed; inset: 0; z-index: 60; background: rgba(1,4,9,.72); }.mobile-menu { position: absolute; right: 0; top: 0; bottom: 0; width: min(86vw, 330px); padding: 16px; background: #161b22; border-left: 1px solid #30363d; box-shadow: -12px 0 32px rgba(1,4,9,.55); }.mobile-menu-header { display: flex; align-items: center; justify-content: space-between; color: #e6edf3; font-size: 14px; margin-bottom: 18px; }.mobile-search :global(> div) { margin: 0 0 18px; padding: 0; }.mobile-links { display: grid; gap: 3px; padding-bottom: 16px; border-bottom: 1px solid #30363d; }.mobile-judge { padding: 16px 0; }.mobile-signout { width: 100%; padding: 8px 10px; border: 0; border-radius: 4px; background: transparent; color: #f85149; font: inherit; font-size: 13px; text-align: left; cursor: pointer; }.mobile-signout:hover { background: #21262d; } }
    `}</style>
  </>;
}
