"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface CaptchaChallenge {
  type: "math" | "text" | "sequence" | "color";
  question: string;
  answer: string;
  options?: string[];
}

interface CustomCaptchaProps {
  onSuccess: (token: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function CustomCaptcha({ onSuccess, onError, className = "" }: CustomCaptchaProps) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const colors = useMemo(() => [
    { name: "red", hex: "#ef4444", class: "bg-red-500" },
    { name: "blue", hex: "#3b82f6", class: "bg-blue-500" },
    { name: "green", hex: "#22c55e", class: "bg-green-500" },
    { name: "yellow", hex: "#eab308", class: "bg-yellow-500" },
    { name: "purple", hex: "#a855f7", class: "bg-purple-500" },
    { name: "orange", hex: "#f97316", class: "bg-orange-500" },
  ], []);

  const generateChallenge = useCallback((): CaptchaChallenge => {
    const challengeTypes = ["math", "text", "sequence", "color"];
    const type = challengeTypes[Math.floor(Math.random() * challengeTypes.length)] as CaptchaChallenge["type"];

    switch (type) {
      case "math": {
        const operations = ["+", "-", "×"];
        const operation = operations[Math.floor(Math.random() * operations.length)];
        let a, b, answer;
        
        if (operation === "+") {
          a = Math.floor(Math.random() * 20) + 1;
          b = Math.floor(Math.random() * 20) + 1;
          answer = a + b;
        } else if (operation === "-") {
          a = Math.floor(Math.random() * 20) + 10;
          b = Math.floor(Math.random() * 10) + 1;
          answer = a - b;
        } else { // multiplication
          a = Math.floor(Math.random() * 9) + 2;
          b = Math.floor(Math.random() * 9) + 2;
          answer = a * b;
        }
        
        return {
          type: "math",
          question: `What is ${a} ${operation} ${b}?`,
          answer: answer.toString(),
        };
      }

      case "text": {
        const challenges = [
          { type: "text" as const, question: "Type the word 'SECURITY' in lowercase:", answer: "security" },
          { type: "text" as const, question: "Type 'HUMAN' backwards:", answer: "NAMUH" },
          { type: "text" as const, question: "What comes after 'A, B, C'?", answer: "D" },
          { type: "text" as const, question: "Type the first letter of the alphabet:", answer: "A" },
          { type: "text" as const, question: "Type 'robot' in UPPERCASE:", answer: "ROBOT" },
          { type: "text" as const, question: "What is the opposite of 'hot'?", answer: "cold" },
          { type: "text" as const, question: "Type the number 'seven' as a digit:", answer: "7" },
         { type: "text" as const, question: "Type the word 'HARVARD' backwards:", answer: "DARVAH" },
         
        ];
        return challenges[Math.floor(Math.random() * challenges.length)];
      }

      case "sequence": {
        const sequences = [
          { type: "sequence" as const, question: "Complete: 2, 4, 6, __", answer: "8" },
          { type: "sequence" as const, question: "Complete: 1, 3, 5, __", answer: "7" },
          { type: "sequence" as const, question: "Complete: 10, 8, 6, __", answer: "4" },
          { type: "sequence" as const, question: "Complete: A, C, E, __", answer: "G" },
          { type: "sequence" as const, question: "Complete: 5, 10, 15, __", answer: "20" },
        ];
        return sequences[Math.floor(Math.random() * sequences.length)];
      }

      case "color": {
        const selectedColors = colors.slice().sort(() => 0.5 - Math.random()).slice(0, 4);
        const correctColor = selectedColors[Math.floor(Math.random() * selectedColors.length)];
        
        return {
          type: "color",
          question: `Click the ${correctColor.name} circle:`,
          answer: correctColor.name,
          options: selectedColors.map(c => c.name),
        };
      }

      default:
        return generateChallenge();
    }
  }, [colors]);

  const generateToken = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const challengeData = `${challenge?.type}-${challenge?.answer}-${timestamp}`;
    return btoa(challengeData) + "." + random;
  };

  const refreshChallenge = useCallback(() => {
    setChallenge(generateChallenge());
    setUserAnswer("");
    setError("");
  }, [generateChallenge]);

  const handleSubmit = async () => {
    if (!challenge) return;
    
    setIsLoading(true);
    setError("");

    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 300));

    const isCorrect = userAnswer.toLowerCase().trim() === challenge.answer.toLowerCase().trim();
    
    if (isCorrect) {
      const token = generateToken();
      onSuccess(token);
    } else {
      setError("Incorrect answer. Please try again.");
      onError?.("Incorrect CAPTCHA answer");
      refreshChallenge();
    }
    
    setIsLoading(false);
  };

  const handleColorClick = (colorName: string) => {
    setUserAnswer(colorName);
    // Auto-submit for color challenges
    setTimeout(() => {
      if (colorName.toLowerCase() === challenge?.answer.toLowerCase()) {
        const token = generateToken();
        onSuccess(token);
      } else {
        setError("Incorrect color. Please try again.");
        onError?.("Incorrect CAPTCHA answer");
        refreshChallenge();
      }
    }, 100);
  };

  useEffect(() => {
    refreshChallenge();
  }, [refreshChallenge]);

  if (!challenge) {
    return <div className="flex justify-center"><span className="loading loading-spinner loading-sm"></span></div>;
  }

  return (
    <div className={`border border-base-300 rounded-lg p-4 bg-base-50 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-base-content">Security Verification</h3>
        <button
          onClick={refreshChallenge}
          className="btn btn-xs btn-ghost"
          title="Get a new challenge"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="mb-3">
        <p className="text-sm text-base-content mb-2">{challenge.question}</p>
        
        {challenge.type === "color" && challenge.options ? (
          <div className="flex gap-2 justify-center">
            {challenge.options.map((colorName) => {
              const color = colors.find(c => c.name === colorName);
              return (
                <button
                  key={colorName}
                  onClick={() => handleColorClick(colorName)}
                  className={`w-8 h-8 rounded-full border-2 border-base-300 hover:border-base-600 transition-colors ${color?.class}`}
                  title={`Click ${colorName}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="input input-bordered input-sm flex-1"
              placeholder="Your answer..."
              disabled={isLoading}
            />
            <button
              onClick={handleSubmit}
              disabled={!userAnswer.trim() || isLoading}
              className="btn btn-sm btn-primary"
            >
              {isLoading ? <span className="loading loading-spinner loading-xs"></span> : "Verify"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-error mt-1">{error}</div>
      )}
    </div>
  );
}