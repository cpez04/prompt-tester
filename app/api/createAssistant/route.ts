import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, model, prompt, uploadedFiles } = body;

    if (!name || !model || !prompt || !uploadedFiles) {
      return NextResponse.json(
        { error: "Missing required fields: name, model, prompt, or uploadedFiles" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Extract file IDs as strings
    const fileIds = uploadedFiles.map((file: { id: string }) => file.id);
    console.log("File IDs:", fileIds);


    const assistant = await openai.beta.assistants.create({
        name,
        description,
        instructions: prompt,
        model,
        tools: [{ type: "code_interpreter" }, { type: "file_search" }],
        tool_resources: {
          file_search: {
            vector_stores: [
                {
                    file_ids: fileIds,
                }
                ],
          },
        },
        temperature: 0,
      });
      
    console.log("Assistant created:", assistant);

    return NextResponse.json({ assistant });
  } catch (error) {
    console.error("Error creating assistant:", error);
    return NextResponse.json({ error: "Failed to create assistant" }, { status: 500 });
  }
}
