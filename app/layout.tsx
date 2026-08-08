import type { Metadata, Viewport } from 'next';
import { League_Gothic, Sora } from 'next/font/google';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sora',
  display: 'swap',
});

const leagueGothic = League_Gothic({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-league-gothic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nube Studio',
  description:
    'Arquitectura en aire quieto. Casas y pequeños edificios públicos en Japón, del primer boceto a la luz habitada.',
};

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
  // The scenes are full-bleed; they run under the notch and the home bar, and
  // the nav pads itself back out with the safe-area insets.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sora.variable} ${leagueGothic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
