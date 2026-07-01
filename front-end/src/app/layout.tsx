import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminShell } from "@/components/AdminShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Painel Administrativo UFS",
  description: "Dashboard administrativo para cursos, usuários, estudantes e vínculos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-100 text-slate-900">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
