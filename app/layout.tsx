import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'AeroType 💨⚡ - Aksesibilitas & Game Berbasis Sensor Tiupan Mikrofon',
  description:
    'Aplikasi web interaktif 100% laptop-based menggunakan Web Audio API untuk mendeteksi tiupan fisik mikrofon.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${fontSans.variable} dark`}>
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
