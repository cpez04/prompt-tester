import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assistantId, threadId, message } = body;

    if (!assistantId || !threadId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: assistantId, threadId, or message" },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Start OpenAI thread run with streaming enabled
    const stream = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      stream: true,
      additional_messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    console.log("Chatbot run started on thread:", threadId);

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {

            if (event.event === "thread.message.delta") {
              const textContent =
                event.data.delta.content
                  ?.filter((block) => block.type === "text")
                  .map((block) => block.text?.value)
                  .join(" ") || "";

              if (textContent) {
                controller.enqueue(new TextEncoder().encode(textContent)); // Stream only text
              }
            }

            if (event.event === "thread.run.failed") {

              if (!event.data.last_error) {
                console.error("Run failed without error details");
                controller.close();
                return;
              }
              const errorMessage = `Error: ${event.data.last_error.code} - ${event.data.last_error.message}`;
              controller.enqueue(new TextEncoder().encode(errorMessage)); 

              controller.close(); 
              return;
            }

            if (event.event === "thread.message.completed") {
              controller.close(); // Close stream when response is complete
            }
          }
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
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error generating chatbot response:", error);
    return NextResponse.json(
      { error: "Failed to generate chatbot response" },
      { status: 500 },
    );
  }
}
