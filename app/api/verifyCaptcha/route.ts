import { NextResponse } from "next/server";

// Simple in-memory store for used tokens (in production, use Redis or database)
const usedTokens = new Set<string>();

// Clean up old tokens periodically
setInterval(() => {
  usedTokens.clear();
}, 10 * 60 * 1000); // Clear every 10 minutes

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid CAPTCHA token" },
        { status: 400 }
      );
    }

    // Check for token reuse (prevent replay attacks)
    if (usedTokens.has(token)) {
      return NextResponse.json(
        { error: "CAPTCHA token already used" },
        { status: 400 }
      );
    }

    // Parse the token (format: base64(type-answer-timestamp).random)
    const [encodedData] = token.split(".");
    
    if (!encodedData) {
      return NextResponse.json(
        { error: "Malformed CAPTCHA token" },
        { status: 400 }
      );
    }

    let decodedData: string;
    try {
      decodedData = atob(encodedData);
    } catch {
      return NextResponse.json(
        { error: "Invalid CAPTCHA token encoding" },
        { status: 400 }
      );
    }

    const [type, answer, timestampStr] = decodedData.split("-");
    const timestamp = parseInt(timestampStr);

    if (!type || !answer || !timestamp) {
      return NextResponse.json(
        { error: "Incomplete CAPTCHA token" },
        { status: 400 }
      );
    }

    // Check if token is expired (5 minutes max)
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    if (now - timestamp > maxAge) {
      return NextResponse.json(
        { error: "CAPTCHA token expired" },
        { status: 400 }
      );
    }

    // Validate token format and basic structure
    const validTypes = ["math", "text", "sequence", "color"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid CAPTCHA type" },
        { status: 400 }
      );
    }

    // Basic answer validation (check if it's not empty and reasonable length)
    if (!answer || answer.length > 50) {
      return NextResponse.json(
        { error: "Invalid CAPTCHA answer format" },
        { status: 400 }
      );
    }

    // Mark token as used to prevent replay attacks
    usedTokens.add(token);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("CAPTCHA verification error:", error);
    return NextResponse.json(
      { error: "CAPTCHA verification failed" },
      { status: 500 }
    );
  }
}