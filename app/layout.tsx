import type { Metadata } from "next";
import Nav from "./components/Nav";
import ToastProvider from "./components/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "감성 재무 다이어리",
  description: "My Money Insights - 감성 재무 다이어리",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <ToastProvider>
          <Nav />
          <main className="max-w-[1100px] m-auto px-8 py-12">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
