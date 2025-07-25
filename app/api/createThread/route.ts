import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { persona, fileIds } = body;

    if (!persona) {
      return NextResponse.json(
        { error: "Missing required field: persona" },
        { status: 400 },
      );
    }

    const openai = getOpenAIClient();

    console.log("Creating thread with persona:", persona);

    const thread = await openai.beta.threads.create({
      ...(Array.isArray(fileIds) &&
        fileIds.length > 0 && {
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
