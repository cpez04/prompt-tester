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
          content: `You are ${persona.name}, ${persona.description}. You are analyzing a syllabus page from the perspective of your persona. Provide your analysis in a conversational, first-person style, as if you are actually this person reading the syllabus. Focus on how this content affects you personally, what questions you have, and what concerns or positive aspects you notice.`
        },
        {
          role: "user",
          content: `Here is page ${pageNumber} of the syllabus:\n\n${content}\n\nPlease analyze this page from your perspective as ${persona.name}.`
        }
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
      { status: 500 }
    );
  }
} 