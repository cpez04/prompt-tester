// Lazy load MuPDF to avoid build issues
let mupdf: typeof import("mupdf") | null = null;

export interface MuPDFLine {
  wmode: number;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  font: {
    name: string;
    family: string;
    weight: string;
    style: string;
    size: number;
  };
  x: number;
  y: number;
  text: string;
}

export interface MuPDFBlock {
  type: string;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  lines: MuPDFLine[];
}

export interface MuPDFPage {
  blocks: MuPDFBlock[];
}

export interface MuPDFDocument {
  pages: MuPDFPage[];
  pageImages: string[];
}

export async function processPDFWithMuPDF(
  base64Pdf: string,
): Promise<MuPDFDocument> {
  try {
    // Lazy load MuPDF to avoid build issues
    if (!mupdf) {
      mupdf = await import("mupdf");
    }

    console.log("🔄 Starting PDF processing with MuPDF...");
    console.log(`📄 PDF size: ${Math.round(base64Pdf.length / 1024)}KB`);

    // Convert base64 to buffer and create MuPDF buffer
    console.log("🔧 Converting base64 to buffer...");
    const pdfBuffer = Buffer.from(base64Pdf, "base64");
    console.log(`📊 Buffer created: ${Math.round(pdfBuffer.length / 1024)}KB`);

    console.log("🔧 Creating MuPDF buffer...");
    const muPdfBuffer = new mupdf.Buffer(pdfBuffer);
    console.log("✅ MuPDF buffer created successfully");

    // Load document using MuPDF openDocument
    console.log("📖 Loading PDF document...");
    const document = mupdf.Document.openDocument(
      muPdfBuffer,
      "application/pdf",
    );
    const pageCount = document.countPages();
    console.log(`✅ Document loaded successfully - ${pageCount} pages found`);

    const pages: MuPDFPage[] = [];
    const pageImages: string[] = [];

    // Process each page
    console.log("🔄 Processing pages...");
    for (let i = 0; i < pageCount; i++) {
      console.log(`📄 Processing page ${i + 1}/${pageCount}...`);

      const page = document.loadPage(i);
      console.log(`✅ Page ${i + 1} loaded`);

      // Extract structured text with coordinates
      console.log(`🔍 Extracting text from page ${i + 1}...`);
      const structuredText = page.toStructuredText("preserve-whitespace");
      const pageData = structuredText.asJSON();

      // Parse the JSON to get our structured format
      const parsedPageData: MuPDFPage = JSON.parse(pageData);
      const blockCount = parsedPageData.blocks?.length || 0;
      const textBlockCount =
        parsedPageData.blocks?.filter((b) => b.type === "text").length || 0;
      console.log(
        `✅ Page ${i + 1} text extracted: ${blockCount} blocks (${textBlockCount} text blocks)`,
      );
      pages.push(parsedPageData);

      // Render page as image for display
      console.log(`🖼️  Rendering page ${i + 1} as image...`);
      const matrix = mupdf.Matrix.identity; // Identity matrix for 1:1 scale
      const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
      const imageBuffer = pixmap.asPNG();
      const base64Image = Buffer.from(imageBuffer).toString("base64");
      console.log(
        `✅ Page ${i + 1} image rendered: ${Math.round(base64Image.length / 1024)}KB`,
      );
      pageImages.push(base64Image);
    }

    console.log("✅ MuPDF processing completed successfully!");
    console.log(
      `📊 Final result: ${pages.length} pages processed, ${pageImages.length} images generated`,
    );

    return {
      pages,
      pageImages,
    };
  } catch (error) {
    console.error("Error processing PDF with MuPDF:", error);
    throw new Error("Failed to process PDF with MuPDF");
  }
}

export function extractTextFromMuPDFPage(page: MuPDFPage): string {
  return page.blocks
    .filter((block) => block.type === "text")
    .map((block) => block.lines.map((line) => line.text).join(" "))
    .join("\n");
}

export function findTextCoordinatesInMuPDFPage(
  page: MuPDFPage,
  searchText: string,
): { x: number; y: number; width: number; height: number } | null {
  // Search through all text lines to find the best match
  for (const block of page.blocks) {
    if (block.type !== "text") continue;

    for (const line of block.lines) {
      // Check if this line contains part of our search text
      if (
        line.text
          .toLowerCase()
          .includes(searchText.toLowerCase().substring(0, 20))
      ) {
        return {
          x: line.bbox.x,
          y: line.bbox.y,
          width: line.bbox.w,
          height: line.bbox.h,
        };
      }
    }
  }

  // Fallback: look for any partial match
  const searchWords = searchText.toLowerCase().split(" ").slice(0, 3); // First 3 words

  for (const block of page.blocks) {
    if (block.type !== "text") continue;

    for (const line of block.lines) {
      const lineText = line.text.toLowerCase();
      if (
        searchWords.some((word) => word.length > 2 && lineText.includes(word))
      ) {
        return {
          x: line.bbox.x,
          y: line.bbox.y,
          width: line.bbox.w,
          height: line.bbox.h,
        };
      }
    }
  }

  return null;
}
