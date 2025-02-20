import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assistantId, threadId, lastChatbotMessage } = body;

    if (!assistantId || !threadId) {
      return NextResponse.json(
        { error: "Missing required fields: assistantId or threadId" },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Use a conditional to handle the two different cases
    let stream;
    if (lastChatbotMessage) {
      stream = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        stream: true,
        additional_messages: [
          {
            role: "user",
            content: lastChatbotMessage,
          },
        ],
      });
    } else {
      stream = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        stream: true,
      });
    }

    console.log("Run started on thread:", threadId);

    // ReadableStream to process OpenAI responses
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
                controller.enqueue(new TextEncoder().encode(textContent));
              }
            }

            if (event.event === "thread.message.completed") {
              controller.close();
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
    console.error("Error starting run:", error);
    return NextResponse.json({ error: "Failed to start run" }, { status: 500 });
  }
}