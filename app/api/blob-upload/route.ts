import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import acceptedFiles from '@/public/acceptedFiles.json';

export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  return handleUpload({
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
}
