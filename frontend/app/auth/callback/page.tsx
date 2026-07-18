"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Finishing Google sign-in…");
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("access_token");
    if (token) { localStorage.setItem("token", token); router.replace("/dashboard"); }
    else setMessage("Google sign-in did not return a session. Please try again.");
  }, [router]);
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#080808", color: "white" }}><p style={{ color: "rgba(255,255,255,.6)" }}>{message}</p></main>;
}
