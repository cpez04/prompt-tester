import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assistantId, threadId, history } = body;

    if (!assistantId || !threadId || !history) {
      return NextResponse.json(
        { error: "Missing required fields: assistantId, threadId, or history" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Format the history as a single user message
    const conversationSummary = history.map(msg => `${msg.role}: ${msg.content}`).join("\n");

    const stream = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      stream: true,
      additional_messages: [
        {
          role: "user",
          content: `Here is the entire conversation history:\n\n${conversationSummary}\n\nPlease generate an appropriate response using the file search tool and the original assistant prompt to respond to the persona.`,
        },
      ],
    });

    console.log("Run started on thread:", threadId);

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            const chunk = JSON.stringify(event) + "\n";
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error generating chatbot response:", error);
    return NextResponse.json(
      { error: "Failed to generate chatbot response" },
      { status: 500 }
    );
  }
}
