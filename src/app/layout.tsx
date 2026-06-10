import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'デュエプレ ビンゴ',
  description: 'デュエルマスターズプレイ バトルキャラバン ビンゴカード',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* iOS 15.4以前向けポリフィル */}
        <script dangerouslySetInnerHTML={{ __html: `
          if (!Object.hasOwn) {
            Object.hasOwn = function(obj, prop) {
              return Object.prototype.hasOwnProperty.call(obj, prop);
            };
          }
          if (!Array.prototype.at) {
            Array.prototype.at = function(n) {
              n = Math.trunc(n) || 0;
              if (n < 0) n += this.length;
              if (n < 0 || n >= this.length) return undefined;
              return this[n];
            };
          }
        `}} />
      </head>
      <body className={`${inter.className} bg-gray-900`}>{children}</body>
    </html>
  )
}
