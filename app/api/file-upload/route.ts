import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { writeFile } from "fs/promises";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert the uploaded file to a buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Save the file temporarily
    const tempPath = path.join("/tmp", file.name);
    await writeFile(tempPath, buffer);

    // Upload file to OpenAI
    const uploadedFile = await openai.files.create({
      file: fs.createReadStream(tempPath),
      purpose: "assistants",
    });

    // Clean up the temporary file after upload
    fs.unlink(tempPath, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });

    console.log("Uploaded file:", uploadedFile);

    return NextResponse.json({ file_id: uploadedFile.id });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
