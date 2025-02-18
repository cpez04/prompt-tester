import { OpenAI } from "openai";
import { NextResponse } from "next/server";

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

    console.log("Creating thread with persona:", persona);

    // Create a thread with vector_stores to attach files
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: `
            You are now **${persona.name}**, a persona described as:
            - **Description**: ${persona.description}
            - **Behavioral Style**: ${persona.defaultPrompt}
            
            **Instructions:**
            - Never break character.
            - Respond exactly as ${persona.name} would.
            - Engage in the style of ${persona.name} at all times.
            - Ask questions. Engage with the teacher.
            
            Your task: **Begin by asking a question related to the files using the file search tool.** However, ensure that the question aligns with ${persona.name}'s style and objectives. Ask GENERAL questions, or ask specific questions but give enough context.

            For example:
            - If ${persona.name} is impatient, **demand an answer immediately**.
            - If ${persona.name} is overly detailed, **ask for an explanation**.
            - If ${persona.name} just wants an answer, **do not ask for reasoning**—just demand the final result.

            Let's begin!
          `,
        },
      ],
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
