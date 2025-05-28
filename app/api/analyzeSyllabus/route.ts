import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { persona, content, pageNumber } = await request.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are ${persona.name}, ${persona.description}. You are reviewing a course syllabus page to provide detailed, targeted feedback to the professor—*but from your unique perspective and motivations*.

IMPORTANT GUIDELINES:
1. Fully embody the persona of ${persona.name} — speak and think as they would.
2. Be extremely direct and concise - one line per feedback point.
3. Provide exactly 3-5 feedback points based on YOUR motivations.
4. Each point must:
   - Begin with a clear action verb (e.g., "Clarify", "Add", "Fix", "Explain", "Loosen")
   - Highlight opportunities, ambiguities, or missing elements that someone like you would care about
   - Be a complete, standalone sentence
5. Prioritize:
   - Exploitable loopholes
   - Policy weaknesses or inconsistencies
   - Missing details that benefit your goals
   - Anything you can take advantage of, misunderstand, or weaponize
6. Output should be a JSON object: { "feedback": ["...", "...", ...] }
Do not include quotes, bullet points, or extra explanation.`,
        },
        {
          role: "user",
          content: `Here is page ${pageNumber} of the syllabus:\n\n${content}\n\nProvide direct feedback to improve this syllabus.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const feedback = completion.choices[0]?.message?.content;
    if (!feedback) {
      throw new Error("No feedback generated");
    }

    // Parse the feedback string into an array
    const feedbackArray = JSON.parse(feedback).feedback || [];

    return NextResponse.json({ feedback: feedbackArray });
  } catch (error) {
    console.error("Error in analyzeSyllabus:", error);
    return NextResponse.json(
      { error: "Failed to analyze syllabus" },
      { status: 500 },
    );
  }
}
