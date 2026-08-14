import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { UIProvider } from '@/lib/UIContext';

import Script from 'next/script';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: 'Scrum Leader Attendance & Points Portal',
  description: 'Scrum team member attendance tracking and points deduction leader panel.',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <UIProvider>
          {children}
        </UIProvider>
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
