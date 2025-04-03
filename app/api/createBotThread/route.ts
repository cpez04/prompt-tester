import { OpenAI } from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileIds } = body;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const thread = await openai.beta.threads.create({
      ...(Array.isArray(fileIds) && fileIds.length > 0 && {
        tool_resources: {
          file_search: {
            vector_stores: [
              {
                file_ids: fileIds,
              },
            ],
          },
        },
      }),
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
