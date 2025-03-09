import { NextResponse } from "next/server";
import OpenAI from "openai";

const default_persona_model = "gpt-4o-mini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assistantId, threadId, lastChatbotMessage, persona } = body;

    if (!assistantId || !threadId) {
      return NextResponse.json(
        { error: "Missing required fields: assistantId or threadId" },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let instructions: string | null = null;
    const additionalMessages: { role: "user"; content: string }[] = [];

    if (lastChatbotMessage) {
      // Add an additional user message guiding the assistant to generate a follow-up
      const followUpMessage = `Here is the response from the course chatbot: "${lastChatbotMessage}". Based on the persona ${persona.name}, ${persona.description}, generate a follow-up in the style of that persona. It can be another question, a comment, or a natural response like a human student. That is, you can answer in incomplete sentences, be casual, and concise.`;
      additionalMessages.push({ role: "user", content: followUpMessage });
    } else {
      // It's the start of the conversation – use instructions instead
      instructions = `You are responding as student ${persona.name}, ${persona.description}. This is the start of the conversation. Use the file search tool to understand the context of the course and generate a natural, concise, human-like question in the style of ${persona.name}. Do not mention, refer to, or allude to uploaded files in your response. Your answer should sound natural and as if you knew the information yourself.`;
    }

    const stream = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      model: default_persona_model,
      stream: true,
      instructions,
      additional_messages: additionalMessages.length > 0 ? additionalMessages : undefined,
    });

    console.log("Run started on thread:", threadId);

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
