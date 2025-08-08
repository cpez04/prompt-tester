import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vectorStoreId, fileIds } = body;

    if (!vectorStoreId && (!fileIds || !Array.isArray(fileIds))) {
      return NextResponse.json(
        { error: "Either vectorStoreId or fileIds must be provided" },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();

    // Check vector store status if provided
    let vectorStoreStatus = null;
    if (vectorStoreId) {
      try {
        const vectorStore = await openai.beta.vectorStores.retrieve(vectorStoreId);
        vectorStoreStatus = {
          id: vectorStore.id,
          status: vectorStore.status as "expired" | "in_progress" | "completed",
          file_counts: vectorStore.file_counts,
        };
      } catch (error) {
        console.error("Error checking vector store:", error);
        vectorStoreStatus = {
          id: vectorStoreId,
          status: "expired" as const,
        };
      }
    }

    // Check file statuses if provided
    let fileStatuses = [];
    if (fileIds && Array.isArray(fileIds)) {
      const filePromises = fileIds.map(async (fileId) => {
        try {
          const file = await openai.files.retrieve(fileId);
          return {
            id: file.id,
            status: file.status === "processed" ? "processed" as const : 
                   file.status === "error" ? "error" as const : "uploaded" as const,
            filename: file.filename,
            purpose: file.purpose,
          };
        } catch (error) {
          console.error(`Error checking file ${fileId}:`, error);
          return {
            id: fileId,
            status: "error" as const,
          };
        }
      });
      fileStatuses = await Promise.all(filePromises);
    }

    const filesReady = fileStatuses.length === 0 || fileStatuses.every(status => status.status === "processed");
    const vectorStoreReady = !vectorStoreStatus || vectorStoreStatus.status === "completed";

    return NextResponse.json({
      ready: filesReady && vectorStoreReady,
      filesReady,
      vectorStoreReady,
      fileStatuses,
      vectorStoreStatus,
    });
  } catch (error) {
    console.error("Error checking vector store status:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}