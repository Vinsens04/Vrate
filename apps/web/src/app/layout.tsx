import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Vrate - Track what you watch',
  description:
    'One place to track movies, series, and anime with progress, ratings, and personal notes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-app-bg text-app-text antialiased selection:bg-brand-primary selection:text-app-bg">
        {children}
      </body>
    </html>
  );
}

