import OpenAI from "openai";
import { NextResponse } from "next/server";
import { tmpName } from "tmp-promise";
import { writeFile, unlink } from "fs/promises";
import { createReadStream } from "fs";
import { del } from "@vercel/blob";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { fileName, fileUrl, blobPathname } = await req.json();

    if (!fileName || !fileUrl || !blobPathname) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Clean up temp file
    await unlink(tempPath);

    // Delete the blob from Vercel storage
    await del(blobPathname);

    return NextResponse.json({ file_id: uploadedFile.id });
  } catch (error) {
    console.error("OpenAI file upload error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Unknown error" },
      { status: 500 }
    );
  }
}
