import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { persona, content, pageNumber } = await request.json();

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are ${persona.name}, ${persona.description}. You are reviewing a syllabus page to provide direct feedback to the professor.

IMPORTANT GUIDELINES:
1. Stay in character as ${persona.name}
2. Be extremely direct and concise - one line per bullet point
3. Focus only on critical issues:
   - Unclear policies
   - Loopholes
   - Missing information
   - Accessibility barriers
   - Critical questions
4. Maximum 5 bullet points total
5. Each bullet point must be a single, clear sentence
6. Start each point with a clear action verb (e.g., "Clarify", "Add", "Fix", "Explain")
7. No explanations or context - just the direct feedback

Format: One line per bullet point, starting with "•" or "-".`,
        },
        {
          role: "user",
          content: `Here is page ${pageNumber} of the syllabus:\n\n${content}\n\nProvide direct feedback to improve this syllabus.`,
        },
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(customReadable, {
      headers: {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Error in analyzeSyllabus:", error);
    return NextResponse.json(
      { error: "Failed to analyze syllabus" },
      { status: 500 },
    );
  }
}
