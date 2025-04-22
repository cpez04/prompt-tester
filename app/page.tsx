"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import ProfileIcon from "@/components/ProfileIcon";
import { motion } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useUser();

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
          Prompt Tester
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-lg max-w-2xl px-4"
        >
          Upload your prompt, assign personas, and simulate how your assistant
          responds. A playground for building and testing AI behaviors for
          educators.
        </motion.p>

        <motion.button
          whileHover={{
            y: -8,
            transition: {
              type: "spring",
              stiffness: 500,
              damping: 15,
            },
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
