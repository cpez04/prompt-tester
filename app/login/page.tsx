"use client";

import { useState, Suspense, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import CustomCaptcha from "@/components/CustomCaptcha";

function LoginContent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [showCaptcha, setShowCaptcha] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const supabase = createPagesBrowserClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push(redirectTo);
      }
    };
    checkAuth();
  }, [router, redirectTo, supabase]);

  const handleAuth = async () => {
    setErrorMsg("");

    // Show CAPTCHA before proceeding
    if (!captchaToken) {
      setShowCaptcha(true);
      return;
    }

    // Verify CAPTCHA token server-side
    try {
      const captchaResponse = await fetch("/api/verifyCaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });

      if (!captchaResponse.ok) {
        setErrorMsg("CAPTCHA verification failed. Please try again.");
        setCaptchaToken("");
        setShowCaptcha(true);
        return;
      }
    } catch {
      setErrorMsg("CAPTCHA verification failed. Please try again.");
      setCaptchaToken("");
      setShowCaptcha(true);
      return;
    }

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
      // Reset CAPTCHA on auth error
      setCaptchaToken("");
      setShowCaptcha(true);
    } else {
      router.push(redirectTo);
    }
  };

  const handleCaptchaSuccess = (token: string) => {
    setCaptchaToken(token);
    setShowCaptcha(false);
    setErrorMsg("");
  };

  const handleCaptchaError = (error: string) => {
    setCaptchaToken("");
    setErrorMsg(error);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 px-4">
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className="alert alert-error shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01M4.93 19h14.14c1.18 0 1.98-1.3 1.4-2.38L13.4 4.62a1.5 1.5 0 00-2.8 0L3.53 16.62C2.95 17.7 3.75 19 4.93 19z"
              />
            </svg>
            <span>{errorMsg}</span>
          </motion.div>
        </div>
      )}

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

        {showCaptcha && (
          <div className="mb-4">
            <CustomCaptcha
              onSuccess={handleCaptchaSuccess}
              onError={handleCaptchaError}
            />
          </div>
        )}

        <button onClick={handleAuth} className="btn btn-primary w-full mb-2">
          {isSignUp ? "Sign Up" : "Sign In"}
        </button>

        {!showCaptcha && captchaToken && (
          <div className="text-xs text-success text-center mb-2">
            ✓ Security verification complete
          </div>
        )}

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
