import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SafeCheck — Automated Content Moderation Dashboard',
  description: 'Minimal Trust & Safety automated moderation dashboard powered by FastAPI and AWS Rekognition.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}

