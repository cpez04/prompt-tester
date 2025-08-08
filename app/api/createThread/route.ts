import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { waitForFilesAndVectorStore } from "@/lib/statusPolling";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { persona, fileIds, vectorStoreId } = body;

    if (!persona) {
      return NextResponse.json(
        { error: "Missing required field: persona" },
        { status: 400 },
      );
    }

    const openai = getOpenAIClient();

    // Wait for files to be ready if files are provided
    if (Array.isArray(fileIds) && fileIds.length > 0) {
      console.log("Waiting for files to be processed before creating thread...");
      
      const { filesReady, fileStatuses } = await waitForFilesAndVectorStore(fileIds);
      
      if (!filesReady) {
        const failedFiles = fileStatuses.filter(status => status.status === "error");
        console.error("Some files failed to process:", failedFiles);
        return NextResponse.json(
          { 
            error: "Files are still processing or failed to process. Please wait and try again.",
            failedFiles: failedFiles.map(f => ({ id: f.id, filename: f.filename }))
          },
          { status: 400 }
        );
      }
      
      console.log("All files are ready for thread creation");
    }

    console.log("Creating thread with persona:", persona);

    const thread = await openai.beta.threads.create({
      ...(vectorStoreId && {
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId],
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
