"use client";

import { useRouter } from "next/navigation";

export default function FeaturesTab() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Prompt Tester</h2>
            <p>
              Test your system prompts against a variety of personas and
              receive feedback.
            </p>
            <div className="card-actions justify-end">
              <button
                className="btn btn-primary"
                onClick={() => router.push("/playground")}
              >
                Open Prompt Tester
              </button>
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <div className="flex items-center gap-2">
              <h2 className="card-title">Syllabus Tester</h2>
              <div className="badge badge-secondary">BETA</div>
            </div>
            <p>
              Stress test your class&apos;s syllabus against a variety of
              personas.
            </p>
            <div className="card-actions justify-end">
              <button
                className="btn btn-primary"
                onClick={() => router.push("/syllabusplayground")}
              >
                Open Syllabus Tester
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}