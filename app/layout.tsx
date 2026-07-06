import type { Metadata, Viewport } from "next";
import { Anton, Oswald, Dancing_Script, Inter } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
});

const dancing = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flag-Fest · Venta y validación QR de entradas",
  description:
    "Sistema de venta, generación y validación QR de entradas para Flags Fest — Green Flags & Red Flags Party.",
};

export const viewport: Viewport = {
  themeColor: "#07070a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${anton.variable} ${oswald.variable} ${dancing.variable} ${inter.variable} antialiased`}
    >
      <body className="min-h-dvh">
        <div className="event-backdrop" aria-hidden />
        {children}
      </body>
    </html>
  );
}
