import type { Metadata } from "next";
import { grift } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel",
  description: "AI-Powered Reminder Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={` ${grift.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
