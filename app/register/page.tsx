"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const db = createClient();

      const { error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/pending-approval`,
        },
      });

      if (error) throw error;

      setSuccess(
        "Registrasi berhasil. Silakan cek email untuk melakukan konfirmasi akun."
      );

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registrasi gagal. Coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithGoogle() {
    setError("");
    setGoogleLoading(true);

    try {
      const db = createClient();

      const { error } = await db.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/pending-approval`,
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mendaftar dengan Google."
      );
      setGoogleLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-700 font-bold text-white">
            SP
          </div>

          <h1 className="mt-4 text-2xl font-bold">Buat akun baru</h1>

          <p className="mt-2 text-sm text-slate-500">
            Daftar untuk mengakses Student Progress Report.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-7 shadow-sm">
          <form onSubmit={submit}>
            <label className="text-sm font-semibold">Nama lengkap</label>
            <input
              required
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mb-5 mt-2 w-full rounded-xl border px-4 py-3"
              placeholder="Nama lengkap"
              autoComplete="name"
            />

            <label className="text-sm font-semibold">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-5 mt-2 w-full rounded-xl border px-4 py-3"
              placeholder="nama@email.com"
              autoComplete="email"
            />

            <label className="text-sm font-semibold">Password</label>

            <div className="relative mb-5 mt-2">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 pr-12"
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                minLength={8}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <label className="text-sm font-semibold">
              Konfirmasi password
            </label>

            <div className="relative mt-2">
              <input
                required
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 pr-12"
                placeholder="Ulangi password"
                autoComplete="new-password"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                aria-label={
                  showConfirmPassword
                    ? "Sembunyikan password"
                    : "Tampilkan password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {success && (
              <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Daftar"}
            </button>
          </form>


          <p className="mt-6 text-center text-sm text-slate-600">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-700 hover:underline"
            >
              Masuk
            </Link>
          </p>

          <p className="mt-5 text-center text-xs">
            <Link href="/" className="text-blue-700">
              Kembali ke halaman utama
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}