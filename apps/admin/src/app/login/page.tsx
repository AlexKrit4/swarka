"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(loginName.trim(), password);
      router.push("/");
    } catch {
      setError("Неверный логин или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <div className="text-center mb-2">
          <p className="text-2xl font-black italic">SWARKA</p>
          <p className="text-sm text-gray-500">Вход в админ-панель</p>
        </div>
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        <div>
          <label className="block text-sm font-medium mb-1">Логин</label>
          <input
            type="text"
            autoComplete="username"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            required
            placeholder="Логин"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Пароль</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </div>
  );
}
