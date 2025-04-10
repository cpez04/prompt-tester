import { NextResponse } from "next/server";
import OpenAI from "openai";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assistantId, threadId, message, files } = body;

    if (!assistantId || !threadId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: assistantId, threadId, or message" },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const stream = await withRetry(async () => {
      return await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        stream: true,
        ...(Array.isArray(files) &&
          files.length > 0 && {
            tool_choice: { type: "file_search" },
          }),
        additional_messages: [
          {
            role: "user",
            content: message,
          },
        ],
      });
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
