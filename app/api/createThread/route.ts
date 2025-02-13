import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { persona, fileIds } = body;

    if (!persona || !fileIds) {
      return NextResponse.json(
        { error: "Missing required fields: persona or fileIds" },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Create a thread with vector_stores to attach files
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: `This is a conversation with the persona: ${persona}`,
        },
      ],
      tool_resources: {
        file_search: {
          vector_stores: [
            {
              file_ids: fileIds, // Correct way to attach files
            },
          ],
        },
      },
    });

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("Error creating thread:", error);
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 },
    );
  }
}
