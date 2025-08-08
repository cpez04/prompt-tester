import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, model, prompt, uploadedFiles } = body;

    if (!name || !model || !prompt || !uploadedFiles) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, model, prompt, or uploadedFiles",
        },
        { status: 400 },
      );
    }

    const openai = getOpenAIClient();

    const fileIds = uploadedFiles.map((file: { id: string }) => file.id);
    console.log("File IDs:", fileIds);

    const assistant = await openai.beta.assistants.create({
      name,
      instructions: prompt,
      model,
      ...(fileIds.length > 0 && {
        tools: [{ type: "code_interpreter" }, { type: "file_search" }],
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
      temperature: 0,
    });

    console.log("Assistant created:", assistant);

    // Extract vector store ID if files were uploaded
    let vectorStoreId = null;
    if (fileIds.length > 0 && assistant.tool_resources?.file_search?.vector_store_ids && assistant.tool_resources.file_search.vector_store_ids.length > 0) {
      vectorStoreId = assistant.tool_resources.file_search.vector_store_ids[0];
    }

    return NextResponse.json({ 
      assistant,
      vectorStoreId 
    });
  } catch (error) {
    console.error("Error creating assistant:", error);
    return NextResponse.json(
      { error: "Failed to create assistant" },
      { status: 500 },
    );
  }
}
