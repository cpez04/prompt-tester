import React, { useState, useEffect, RefObject } from "react";

interface TutorialOverlayProps {
  active: boolean;
  setActive: (active: boolean) => void;
  refMap: Record<string, RefObject<HTMLElement>>;
  disclaimerAccepted: boolean;
}

// Use keyof typeof refMap for refName type
// We'll pass refMap as a prop, so we can't statically type it here, but we can use string | null
const tutorialSteps: {
  refName: string | null;
  message: string;
}[] = [
  {
    refName: null,
    message:
      "Welcome to the PromptTester Playground! This interactive tutorial will guide you through setting up and running a test. Click Next to begin, or Skip to exit the tutorial at any time.",
  },
  {
    refName: "assistantNameRef",
    message:
      "This is where you name your assistant, which acts as your course chatbot. This chatbot will be interacting with your students, which we refer to as personas here. Pick something descriptive!",
  },
  {
    refName: "modelRef",
    message: "From the dropdown menu, choose the AI model for your assistant.",
  },
  {
    refName: "promptUploaderRef",
    message:
      "Upload your prompt and any files needed for the test run. Files, while optional, help ground the chatbot and personas in a more realistic context. They may include syllabi, problem sets, or other course materials.",
  },
  {
    refName: "personaContextRef",
    message:
      "Describe the situation or context for the personas in a sentence or two. This helps the personas, who represent different types of students or users who will interact with the chatbot, better act in the context of the how the chatbot assistant will be used.",
  },
  {
    refName: "personaCarouselRef",
    message:
      "Select one or more pre-made personas to participate in the test run, or create your own.",
  },
  {
    refName: "messagesPerSideRef",
    message:
      "Set how many messages each side will exchange. More messages allow for longer, more in-depth conversations.",
  },
  {
    refName: "runTestButtonRef",
    message:
      "Click here to start your test run! Start seeing the conversations between the chatbot and the personas, and then evaluate the results afterwards.",
  },
];

const ESTIMATED_BUBBLE_HEIGHT = 220; // px

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  active,
  setActive,
  refMap,
  disclaimerAccepted,
}) => {
  const [tutorialStep, setTutorialStep] = useState(0);
  const [readyToShowBubble, setReadyToShowBubble] = useState(true);

  // Show tutorial after disclaimer is accepted
  useEffect(() => {
    if (disclaimerAccepted && active) {
      setTutorialStep(0);
    }
  }, [disclaimerAccepted, active]);

  // Scroll highlighted element into view on tutorial step change
  useEffect(() => {
    const step = tutorialSteps[tutorialStep];
    if (active && step.refName) {
      setReadyToShowBubble(false);
      const ref = refMap[step.refName];
      const el = ref?.current;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setReadyToShowBubble(true), 300);
      } else {
        setReadyToShowBubble(true);
      }
    } else {
      setReadyToShowBubble(true);
    }
  }, [tutorialStep, active, refMap]);

  if (!active) return null;

  const step = tutorialSteps[tutorialStep];
  const targetRef = step.refName ? refMap[step.refName] : null;
  const targetRect = targetRef?.current?.getBoundingClientRect();

  // Bubble position: below or above the target depending on space
  let bubbleStyle: React.CSSProperties;
  if (targetRect) {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;
    if (
      spaceBelow < ESTIMATED_BUBBLE_HEIGHT &&
      spaceAbove > ESTIMATED_BUBBLE_HEIGHT
    ) {
      // Place bubble above the target
      bubbleStyle = {
        position: "fixed",
        top: targetRect.top - ESTIMATED_BUBBLE_HEIGHT + 12,
        left: targetRect.left,
        zIndex: 1002,
        maxWidth: 420,
      };
    } else {
      // Place bubble below the target (default)
      bubbleStyle = {
        position: "fixed",
        top: targetRect.bottom + 12,
        left: targetRect.left,
        zIndex: 1002,
        maxWidth: 420,
      };
    }
  } else if (tutorialStep === 0) {
    // Centered for welcome step
    bubbleStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 1002,
      maxWidth: 520,
      width: "96vw",
    };
  } else {
    bubbleStyle = { display: "none" };
  }

  // Highlight style
  const highlightStyle: React.CSSProperties = targetRect
    ? {
        position: "fixed",
        top: targetRect.top - 4,
        left: targetRect.left - 4,
        width: targetRect.width + 8,
        height: targetRect.height + 8,
        border: "2px solid #3b82f6",
        borderRadius: 8,
        boxShadow: "0 0 0 6px rgba(59,130,246,0.2)",
        zIndex: 1001,
        pointerEvents: "none" as React.CSSProperties["pointerEvents"],
      }
    : { display: "none" };

  // Four overlay divs to blur only outside the highlight
  let overlays = null;
  if (tutorialStep === 0) {
    overlays = (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.2)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          pointerEvents: "auto",
        }}
      />
    );
  } else if (targetRect) {
    const x = targetRect.left - 6;
    const y = targetRect.top - 6;
    const w = targetRect.width + 12;
    const h = targetRect.height + 12;
    overlays = (
      <>
        {/* Top */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: y,
            background: "rgba(0,0,0,0.2)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            pointerEvents: "auto",
          }}
        />
        {/* Left */}
        <div
          style={{
            position: "fixed",
            top: y,
            left: 0,
            width: x,
            height: h,
            background: "rgba(0,0,0,0.2)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            pointerEvents: "auto",
          }}
        />
        {/* Right */}
        <div
          style={{
            position: "fixed",
            top: y,
            left: x + w,
            width: `calc(100vw - ${x + w}px)`,
            height: h,
            background: "rgba(0,0,0,0.2)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            pointerEvents: "auto",
          }}
        />
        {/* Bottom */}
        <div
          style={{
            position: "fixed",
            top: y + h,
            left: 0,
            width: "100vw",
            height: `calc(100vh - ${y + h}px)`,
            background: "rgba(0,0,0,0.2)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            pointerEvents: "auto",
          }}
        />
      </>
    );
  } else {
    overlays = (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.2)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          pointerEvents: "auto",
        }}
      />
    );
  }

  // Helper to finish/skip tutorial
  const finishTutorial = () => {
    setActive(false);
  };

  // Helper to go to next step
  const nextStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      finishTutorial();
    }
  };

  return (
    <>
      {/* Blur overlays around the highlight */}
      {overlays}
      {/* Highlighted element border */}
      {tutorialStep !== 0 && readyToShowBubble && (
        <div style={highlightStyle} />
      )}
      {/* Bubble */}
      {readyToShowBubble && (
        <div
          style={bubbleStyle}
          className="bg-base-100 p-4 rounded shadow-xl border border-base-200 animate-fade-in"
        >
          <div className="mb-2 text-base font-semibold">Tutorial</div>
          <div className="mb-4 text-sm">{step.message}</div>
          <div className="flex gap-2 justify-end">
            <button className="btn btn-sm btn-ghost" onClick={finishTutorial}>
              Skip
            </button>
            <button className="btn btn-sm btn-primary" onClick={nextStep}>
              {tutorialStep === tutorialSteps.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TutorialOverlay;
