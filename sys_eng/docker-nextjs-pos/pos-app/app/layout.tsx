import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { ThemeToggle } from "./components/theme-toggle";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SparkServe",
  description: "Restaurant ordering, table sessions, and loyalty rewards.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
  },
};

const themeToggleEnabled = process.env.NEXT_PUBLIC_THEME_TOGGLE_ENABLED !== "false";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ThemeToggle enabled={themeToggleEnabled} />
      </body>
    </html>
  );
}
