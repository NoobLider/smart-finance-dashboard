import "./globals.css";

import type { Metadata } from "next";
import { ReactNode } from "react";

import { Nav } from "./components/nav";

export const metadata: Metadata = {
  title: "Smart Finance Dashboard",
  description: "Local-first personal finance dashboard MVP",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
