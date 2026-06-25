import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SQL Query Generator — AI-Powered SQL Assistant",
  description:
    "Convert natural language to optimized SQL queries instantly. Powered by Groq LLM. Supports MySQL & PostgreSQL.",
  keywords: ["SQL", "query generator", "AI", "natural language", "database", "MySQL", "PostgreSQL"],
  openGraph: {
    title: "SQL Query Generator",
    description: "Convert natural language to SQL queries with AI",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-surface text-white antialiased">
        {children}
      </body>
    </html>
  );
}
