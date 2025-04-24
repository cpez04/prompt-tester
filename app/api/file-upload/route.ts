import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { put, del } from "@vercel/blob";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the Vercel serverless function payload limit in bytes
const MAX_DIRECT_UPLOAD_SIZE = 4 * 1024 * 1024; // 4 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Read file content to determine size
    const fileContent = await file.arrayBuffer();
    const buffer = Buffer.from(fileContent);

    const tempPath = path.join("/tmp", file.name);
    fs.writeFileSync(tempPath, buffer);

    let openaiFileUpload;

    if (buffer.byteLength <= MAX_DIRECT_UPLOAD_SIZE) {
      // Direct upload to OpenAI 
      openaiFileUpload = await openai.files.create({
        file: fs.createReadStream(tempPath),
        purpose: "assistants",
      });

      console.log(`Uploaded ${file.name} directly to OpenAI.`);
    } else {
      // Use Vercel Blob storage to upload file
      const blob = await put(file.name, file, { access: "public" });
      console.log("Uploaded to Vercel Blob:", blob.url);

      const blobResponse = await fetch(blob.url);
      const blobFileContent = await blobResponse.arrayBuffer();

      openaiFileUpload = await openai.files.create({
        file: new File([blobFileContent], file.name, { type: file.type }),
        purpose: "assistants",
      });

      // Delete file from Vercel Blob storage
      await del(blob.pathname);
      console.log("Deleted from Vercel Blob:", blob.pathname);
    }

    return NextResponse.json({ file_id: openaiFileUpload.id });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
