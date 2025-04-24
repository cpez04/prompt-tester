import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileType, fileContent } = await req.json();

    if (!fileName || !fileType || !fileContent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Convert the array back to a Uint8Array and create a File object
    const file = new File(
      [new Uint8Array(fileContent)],
      fileName,
      { type: fileType },
    );

    // Upload to OpenAI
    const openaiFileUpload = await openai.files.create({
      file,
      purpose: "assistants",
    });

    console.log(`Uploaded ${fileName} to OpenAI.`);

    return NextResponse.json({ file_id: openaiFileUpload.id });
  } catch (error) {
    console.error("OpenAI file upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file to OpenAI" },
      { status: 500 },
    );
  }
} 