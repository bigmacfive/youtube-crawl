import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transcript Desk",
  description:
    "Local-first YouTube transcript workspace with bring-your-own AI providers.",
};

// Inline script to apply theme before paint (prevents flash)
// Light is CSS default; only apply data-theme if user chose dark
const themeScript = `(function(){try{var t=localStorage.getItem("youtube-crawl.theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;

// Fallback for Cmd+C/V/X/A in native WebKit renderers where the
// macOS Edit menu responder chain may not reach the web view.
const editShortcutsScript = `(function(){
document.addEventListener("keydown",function(e){
if(!e.metaKey)return;
var k=e.key.toLowerCase();
if(k==="c"){document.execCommand("copy")}
else if(k==="v"){document.execCommand("paste")}
else if(k==="x"){document.execCommand("cut")}
else if(k==="a"){document.execCommand("selectAll")}
else{return}
});
})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: editShortcutsScript }} />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/fonts-archive/GoormSans/subsets/goorm-sans-dynamic-subset.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
