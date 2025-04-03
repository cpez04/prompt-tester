import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoredDataProvider } from "@/components/StoredDataContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prompt Tester",
  description: "A project by Christopher Perez",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StoredDataProvider>
          <div className="flex flex-col min-h-screen">
            <main className="flex-grow">{children}</main>
            <footer className="w-full bg-base-200 text-base-content p-4 text-center text-sm">
              <p>
                Have feedback?{" "}
                <a
                  href="https://forms.gle/your-google-form-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary"
                >
                  Click here to share it with us!
                </a>
              </p>
            </footer>
          </div>
        </StoredDataProvider>
      </body>
    </html>
  );
}
