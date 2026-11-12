import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { APP_NAME } from "@/lib/restaurant";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Pide desde tu mesa y sigue tu pedido en tiempo real.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff", // --color-surface
  viewportFit: "cover", // permite usar env(safe-area-inset-*) en la barra inferior
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
