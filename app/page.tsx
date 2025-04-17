"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import ProfileIcon from "@/components/ProfileIcon";

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
    <div className="min-h-screen px-4">
      <div className="absolute top-4 right-4">
        <ProfileIcon user={user} loading={loading} />
      </div>
      <div className="flex flex-col items-center justify-center h-full text-center pt-32">
        <h1 className="text-5xl font-bold mb-4">Prompt Tester</h1>
        <p className="text-lg text-base-content max-w-xl mb-8">
          Upload your prompt, assign personas, and simulate how your assistant
          responds. A playground for building and testing AI behaviors for
          educators.
        </p>
        <button className="btn btn-primary btn-lg" onClick={handleBegin}>
          {user ? "Go to Dashboard" : "Click to Login"}
        </button>
      </div>
    </div>
  );
}
