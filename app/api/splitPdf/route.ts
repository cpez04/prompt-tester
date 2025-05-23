import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(request: Request) {
  try {
    const { base64Pdf } = await request.json();
    
    // Convert base64 to Uint8Array
    const pdfBytes = Uint8Array.from(atob(base64Pdf), c => c.charCodeAt(0));
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    
    // Array to store individual page PDFs
    const pages: string[] = [];
    
    // Split into individual pages
    for (let i = 0; i < pageCount; i++) {
      // Create a new PDF document for this page
      const newPdf = await PDFDocument.create();
      
      // Copy the page
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
      
      // Save the single page PDF
      const singlePageBytes = await newPdf.save();
      
      // Convert to base64
      const base64 = btoa(String.fromCharCode(...singlePageBytes));
      pages.push(`data:application/pdf;base64,${base64}`);
    }
    
    return NextResponse.json({ pages });
  } catch (error) {
    console.error("Error in splitPdf:", error);
    return NextResponse.json(
      { error: "Failed to split PDF" },
      { status: 500 }
    );
  }
} 