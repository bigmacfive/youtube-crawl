import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "youtube-crawl",
  description:
    "Local-first YouTube transcript extraction with bring-your-own OpenAI, Claude, and Google API keys.",
};

// Inline script to apply theme before paint (prevents flash)
// Light is CSS default; only apply data-theme if user chose dark
const themeScript = `(function(){try{var t=localStorage.getItem("youtube-crawl.theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/fonts-archive/GoormSans/subsets/goorm-sans-dynamic-subset.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
