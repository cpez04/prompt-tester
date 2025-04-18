"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

function LoginContent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const supabase = createPagesBrowserClient();

  const handleAuth = async () => {
    setErrorMsg("");

    let response;

    if (isSignUp) {
      response = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName,
            lastName,
          },
        },
      });

      if (!response.error) {
        // Initialize user limit after successful signup
        try {
          const initResponse = await fetch("/api/initUserLimit", {
            method: "POST",
          });

          if (!initResponse.ok) {
            console.error("Failed to initialize user limit");
          }
        } catch (error) {
          console.error("Error initializing user limit:", error);
        }
      }
    } else {
      response = await supabase.auth.signInWithPassword({ email, password });
    }

    const { error } = response;

    if (error) {
      setErrorMsg(error.message);
    } else {
      router.push(redirectTo);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 px-4">
      <div className="card bg-base-100 shadow-xl p-8 max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {isSignUp ? "Create Account" : "Login"}
        </h2>

        {isSignUp && (
          <>
            <input
              type="text"
              className="input input-bordered w-full mb-4"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />

            <input
              type="text"
              className="input input-bordered w-full mb-4"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </>
        )}

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

        <div className="flex flex-col items-center gap-2">
          {!isSignUp && (
            <button
              className="text-sm text-blue-500 hover:underline"
              onClick={() => router.push("/forgot-password")}
            >
              Forgot Password?
            </button>
          )}
          <button
            className="text-sm text-blue-500 hover:underline"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-base-200">
          <span className="loading loading-spinner loading-lg" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
