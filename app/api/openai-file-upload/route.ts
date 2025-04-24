import OpenAI from "openai";
import { NextResponse } from "next/server";
import { tmpName } from "tmp-promise";
import { writeFile, unlink } from "fs/promises";
import { createReadStream } from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { fileName, fileUrl } = await req.json();

    if (!fileName || !fileUrl) {
      return NextResponse.json(
        { error: "Missing fileName or fileUrl" },
        { status: 400 }
      );
    }

    // Download from Vercel Blob
    const blobResponse = await fetch(fileUrl);
    const arrayBuffer = await blobResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write to temp file
    const tempPath = await tmpName({ postfix: `-${fileName}` });
    await writeFile(tempPath, buffer);

    // Upload via fs.ReadStream
    const uploadedFile = await openai.files.create({
      file: createReadStream(tempPath),
      purpose: "assistants",
    });

    // Clean up
    await unlink(tempPath);

    return NextResponse.json({ file_id: uploadedFile.id });
  } catch (error) {
    console.error("OpenAI file upload error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Unknown error" },
      { status: 500 }
    );
  }
}
