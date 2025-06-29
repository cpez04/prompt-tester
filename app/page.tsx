"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/components/UserContext";
import ProfileIcon from "@/components/ProfileIcon";
import { motion } from "framer-motion";
import { useEffect, useState, Suspense } from "react";

function SearchParamsHandler({
  setSuccessMessage,
  setShowSuccess,
}: {
  setSuccessMessage: (msg: string) => void;
  setShowSuccess: (show: boolean) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const message = searchParams.get("message");
    if (message) {
      setSuccessMessage(message);
      setShowSuccess(true);
      router.replace("/");
    }
  }, [searchParams, router, setSuccessMessage, setShowSuccess]);

  return null;
}

function TypewriterText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTyping, setStartTyping] = useState(false);

  useEffect(() => {
    // Add a delay before starting the typing animation
    const startDelay = setTimeout(() => {
      setStartTyping(true);
    }, 200);

    return () => clearTimeout(startDelay);
  }, []);

  useEffect(() => {
    if (!startTyping) return;

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, startTyping]);

  return (
    <span className={className}>
      {displayText}
      <span className="inline-block w-0.5 h-12 bg-gradient-to-r from-cyan-400 to-purple-600 dark:from-sky-400 dark:to-fuchsia-500 ml-2 animate-[blink_1s_ease-in-out_infinite]" />
    </span>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleBegin = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center pt-32">
        <div className="skeleton w-64 h-12 mb-4"></div>
        <div className="skeleton w-96 h-6 mb-8"></div>
        <div className="skeleton w-32 h-12"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-base-100 px-4 text-base-content overflow-hidden transition-colors duration-500">
      {/* Subtle animated background */}
      <div className="absolute inset-0 z-0 before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] before:from-purple-100/40 before:via-transparent before:to-transparent dark:before:from-blue-900/20 dark:before:via-transparent dark:before:to-transparent before:blur-3xl before:animate-pulse" />

      <Suspense fallback={null}>
        <SearchParamsHandler
          setSuccessMessage={setSuccessMessage}
          setShowSuccess={setShowSuccess}
        />
      </Suspense>

      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, x: 20, y: -20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 20, y: -20 }}
          className="fixed top-6 right-6 z-50 w-[90%] max-w-sm"
        >
          <div className="flex items-start justify-between gap-4 px-5 py-4 bg-green-100 text-green-800 border border-green-300 rounded-lg shadow-lg dark:bg-green-900/20 dark:text-green-200 dark:border-green-700">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 shrink-0 text-green-600 dark:text-green-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm font-medium">{successMessage}</span>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="text-green-700 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200 transition"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </motion.div>
      )}

      <div className="absolute top-4 right-4 z-20">
        <ProfileIcon user={user} loading={loading} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-screen text-center space-y-6">
        <motion.h1
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-600 dark:from-sky-400 dark:to-fuchsia-500"
        >
          <TypewriterText text="Prompt Tester" />
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="max-w-2xl px-4"
        >
          <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 text-left font-mono text-sm">
            <div className="text-blue-600 dark:text-blue-400">
              description: |
            </div>
            <div className="text-gray-700 dark:text-gray-300 ml-4">
              Test your AI assistant with diverse personas in realistic
              conversations. Upload prompts, simulate student interactions, and
              evaluate responses to build more effective educational AI tools.
            </div>
          </div>
        </motion.div>

        <motion.button
          whileHover={{
            y: -8,
            transition: { type: "spring", stiffness: 800, damping: 25 },
          }}
          whileTap={{ scale: 0.96 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          onClick={handleBegin}
          className="px-6 py-3 rounded-full bg-primary text-primary-content font-medium text-base shadow-md transition-colors duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2"
        >
          {user ? "Go to Dashboard" : "Click to Login"}
        </motion.button>
      </div>
    </div>
  );
}
