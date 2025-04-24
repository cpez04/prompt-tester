import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import acceptedFiles from "@/public/acceptedFiles.json";

export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: Object.keys(acceptedFiles),
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("✅ Upload complete!", blob);
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Blob upload error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
