import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AR Menu Generator",
  description: "View restaurant dishes in augmented reality",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
