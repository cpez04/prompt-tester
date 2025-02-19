import { OpenAI } from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileIds } = body;

    if (!fileIds) {
      return NextResponse.json(
        { error: "Missing required field: fileIds" },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Create a thread with vector_stores to attach files
    const thread = await openai.beta.threads.create({
      tool_resources: {
        file_search: {
          vector_stores: [
            {
              file_ids: fileIds,
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
      { status: 500 }
    );
  }
}
