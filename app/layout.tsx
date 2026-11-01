import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NotificationProvider } from "@/app/components/NotificationProvider";

export const metadata: Metadata = {
  title: "Student Progress Report",
  description: "Platform laporan perkembangan siswa",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}