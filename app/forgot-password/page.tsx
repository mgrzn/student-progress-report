"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) throw error;

      setSuccess(
        "Jika email tersebut terdaftar, link reset password akan dikirim. Silakan periksa inbox atau folder spam."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengirim permintaan reset password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-700 font-bold text-white">
            SP
          </div>

          <h1 className="mt-4 text-2xl font-bold">Lupa Password?</h1>

          <p className="mt-2 text-sm text-slate-500">
            Masukkan email akun Anda untuk menerima link reset password.
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
            className="mt-2 w-full rounded-xl border px-4 py-3"
            placeholder="nama@email.com"
            autoComplete="email"
          />

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm leading-6 text-green-700">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Mengirim..." : "Kirim Link Reset"}
          </button>

          <p className="mt-6 text-center text-sm">
            <Link
              href="/login"
              className="font-semibold text-blue-700 hover:underline"
            >
              Kembali ke Login
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}