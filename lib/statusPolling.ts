import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface FileStatus {
  id: string;
  status: "uploaded" | "processed" | "error";
  filename?: string;
  purpose?: string;
}

export interface VectorStoreStatus {
  id: string;
  status: "expired" | "in_progress" | "completed";
  file_counts?: {
    in_progress: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  };
}

export async function pollFileStatus(
  fileId: string,
  maxAttempts: number = 30,
  intervalMs: number = 1000
): Promise<FileStatus> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const file = await openai.files.retrieve(fileId);
      
      if (file.status === "processed") {
        return {
          id: file.id,
          status: "processed",
          filename: file.filename,
          purpose: file.purpose,
        };
      }
      
      if (file.status === "error") {
        return {
          id: file.id,
          status: "error",
          filename: file.filename,
          purpose: file.purpose,
        };
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    } catch (error) {
      console.error(`Error checking file status (attempt ${attempt}):`, error);
      if (attempt === maxAttempts) {
        return {
          id: fileId,
          status: "error",
        };
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  return {
    id: fileId,
    status: "error",
  };
}

export async function pollVectorStoreStatus(
  vectorStoreId: string,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<VectorStoreStatus> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const vectorStore = await openai.beta.vectorStores.retrieve(vectorStoreId);
      
      if (vectorStore.status === "completed") {
        return {
          id: vectorStore.id,
          status: "completed",
          file_counts: vectorStore.file_counts,
        };
      }
      
      if (vectorStore.status === "expired") {
        return {
          id: vectorStore.id,
          status: "expired",
          file_counts: vectorStore.file_counts,
        };
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    } catch (error) {
      console.error(`Error checking vector store status (attempt ${attempt}):`, error);
      if (attempt === maxAttempts) {
        return {
          id: vectorStoreId,
          status: "expired",
        };
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  return {
    id: vectorStoreId,
    status: "expired",
  };
}

export async function waitForFilesAndVectorStore(
  fileIds: string[],
  vectorStoreId?: string
): Promise<{
  filesReady: boolean;
  vectorStoreReady: boolean;
  fileStatuses: FileStatus[];
  vectorStoreStatus?: VectorStoreStatus;
}> {
  const filePromises = fileIds.map(fileId => pollFileStatus(fileId));
  const vectorStorePromise = vectorStoreId 
    ? pollVectorStoreStatus(vectorStoreId)
    : Promise.resolve(undefined);
  
  const [fileStatuses, vectorStoreStatus] = await Promise.all([
    Promise.all(filePromises),
    vectorStorePromise,
  ]);
  
  const filesReady = fileStatuses.every(status => status.status === "processed");
  const vectorStoreReady = !vectorStoreStatus || vectorStoreStatus.status === "completed";
  
  return {
    filesReady,
    vectorStoreReady,
    fileStatuses,
    vectorStoreStatus,
  };
}