import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
export const metadata: Metadata = { title: "CatetYuk", description: "Catat keuangan pribadimu" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="id"><body className={`${jakarta.variable} font-sans`}>{children}</body></html>);
}
