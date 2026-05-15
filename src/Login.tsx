import React, { useState } from "react";
import { authLogin } from "./sheetsApi";
import type { Session } from "./types";

interface LoginProps {
  title: string;
  expectedRole?: string;
  allowedRoles?: string[];
  onLogin: (session: Session) => void;
}

export default function Login({ title, expectedRole, allowedRoles, onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await authLogin(password, username);
      if (data.ok && data.role) {
        const role = data.role.trim();
        const acceptedRoles = allowedRoles || (expectedRole ? [expectedRole] : []);
        const isAllowed =
          !acceptedRoles.length ||
          acceptedRoles.some((acceptedRole) => role.toLowerCase() === acceptedRole.toLowerCase());

        if (!isAllowed) {
          setError(`You are not authorized to view this page.`);
        } else {
          onLogin({ role, shopId: data.shopId, token: data.token });
        }
      } else {
        setError((data as any).reason || "Login failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: "2rem auto", padding: 24, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>{title}</h2>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          style={{ width: "100%", padding: 8 }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: 8 }}
        />
      </div>
      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}
      <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
