import type { Metadata } from 'next';
import ToastProvider from './components/ToastProvider';
import './globals.css';

export const metadata: Metadata = {
  title: '감성 재무 다이어리',
  description: 'My Money Insights - 감성 재무 다이어리',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
