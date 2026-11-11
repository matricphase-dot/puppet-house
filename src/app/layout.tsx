import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Puppet House — Pull the strings. Lose control.",
  description: "Create an AI contestant, give it a secret agenda, and survive a live reality show with only three whispers.",
};

export const viewport: Viewport = {
  themeColor: "#111014",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
