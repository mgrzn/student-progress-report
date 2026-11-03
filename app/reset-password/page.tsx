"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();

        if (!mounted) return;

        setValidSession(!error && !!data.user);
      } catch {
        if (mounted) setValidSession(false);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

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
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      await supabase.auth.signOut();

      router.replace("/login?password_updated=1");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui password."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <p className="text-sm text-slate-500">
          Memeriksa sesi reset password...
        </p>
      </main>
    );
  }

  if (!validSession) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md rounded-2xl border bg-white p-7 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">
            Link reset tidak valid
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Link mungkin sudah kedaluwarsa atau tidak dapat digunakan.
            Silakan minta link reset password yang baru.
          </p>

          <Link
            href="/forgot-password"
            className="mt-6 inline-block w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white"
          >
            Minta Link Baru
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-700 font-bold text-white">
            SP
          </div>

          <h1 className="mt-4 text-2xl font-bold">
            Buat Password Baru
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Masukkan password baru untuk akun Anda.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border bg-white p-7 shadow-sm"
        >
          <label className="text-sm font-semibold">
            Password Baru
          </label>

          <div className="relative mb-5 mt-2">
            <input
              required
              type={showPassword ? "text" : "password"}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 pr-12"
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              aria-label={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }
              title={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <label className="text-sm font-semibold">
            Konfirmasi Password Baru
          </label>

          <div className="relative mt-2">
            <input
              required
              type={showConfirmPassword ? "text" : "password"}
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 pr-12"
              placeholder="Ulangi password baru"
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword((prev) => !prev)
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              aria-label={
                showConfirmPassword
                  ? "Sembunyikan password"
                  : "Tampilkan password"
              }
              title={
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

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </form>
      </div>
    </main>
  );
}