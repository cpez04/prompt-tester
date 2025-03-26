'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  const handleBegin = () => {
    router.push('/playground');
  };

  return (
    <div className="min-h-screen bg-base-200 px-4 relative">
      {/* Admin Login (top right) */}
      <div className="absolute top-4 right-4">
        <button className="btn btn-outline btn-sm" disabled>
          Admin Login
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center h-full text-center pt-32">
        <h1 className="text-5xl font-bold mb-4">Prompt Tester</h1>
        <p className="text-lg text-base-content max-w-xl mb-8">
          Upload your prompt, assign personas, and simulate how your assistant responds.
          A playground for building and testing AI behavior.
        </p>
        <button className="btn btn-primary btn-lg" onClick={handleBegin}>
          Click to Begin
        </button>
      </div>
    </div>
  );
}
