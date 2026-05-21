import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flowbase Productivity Workspace",
  description: "A calm productivity workspace for pages, boards, tasks, and AI support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, padding: 0 }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
