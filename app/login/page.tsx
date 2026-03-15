"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.replace("/");
    } else {
      const data = await res.json();
      setError(data.error ?? "오류가 발생했습니다");
      setPassword("");
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--light-pink)",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "2.5rem 2rem",
          boxShadow: "0 4px 24px rgba(232, 180, 188, 0.2)",
          border: "1px solid rgba(232, 180, 188, 0.2)",
          width: "100%",
          maxWidth: 360,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>💰</div>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--gray)",
            marginBottom: "0.25rem",
          }}
        >
          My Money Insights
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--gray-light)",
            marginBottom: "2rem",
          }}
        >
          비밀번호를 입력해주세요
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoFocus
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: 10,
              border: error
                ? "1.5px solid #f87171"
                : "1.5px solid var(--light-gray)",
              fontSize: "1rem",
              outline: "none",
              marginBottom: "0.5rem",
              boxSizing: "border-box",
              color: "var(--gray)",
            }}
          />
          {error && (
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#f87171",
                marginBottom: "0.75rem",
              }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: 10,
              background: "var(--medium-pink)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "1rem",
              border: "none",
              cursor: loading || !password ? "not-allowed" : "pointer",
              opacity: loading || !password ? 0.6 : 1,
              marginTop: error ? 0 : "0.5rem",
            }}
          >
            {loading ? "확인 중..." : "입장"}
          </button>
        </form>
      </div>
    </div>
  );
}
