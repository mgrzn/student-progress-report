"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const db = createClient();
      const { error } = await db.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-700 font-bold text-white">
            SP
          </div>

          <h1 className="mt-4 text-2xl font-bold">Masuk ke akun</h1>
          <p className="mt-2 text-sm text-slate-500">
            Gunakan email dan password terdaftar.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border bg-white p-7 shadow-sm"
        >
          <label className="text-sm font-semibold">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-5 mt-2 w-full rounded-xl border px-4 py-3"
            placeholder="nama@email.com"
          />

          <label className="text-sm font-semibold">Password</label>

          <div className="relative mt-2">
            <input
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 pr-12"
              placeholder="Password"
              autoComplete="current-password"
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              aria-label={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }
              title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>

          <p className="mt-5 text-center text-xs">
            <Link href="/" className="text-blue-700">
              Kembali ke halaman utama
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}