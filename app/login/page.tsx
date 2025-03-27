"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const supabase = createPagesBrowserClient();

  const handleAuth = async () => {
    setErrorMsg("");

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg(error.message);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 px-4">
      <div className="card bg-base-100 shadow-xl p-8 max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {isSignUp ? "Create Account" : "Login"}
        </h2>

        <input
          type="email"
          className="input input-bordered w-full mb-4"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="input input-bordered w-full mb-4"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {errorMsg && <p className="text-error text-sm mb-2">{errorMsg}</p>}

        <button onClick={handleAuth} className="btn btn-primary w-full mb-2">
          {isSignUp ? "Sign Up" : "Sign In"}
        </button>

        <button
          className="text-sm text-center text-blue-500 hover:underline"
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
