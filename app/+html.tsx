import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a6b3c" />

        <meta property="og:title" content="ButikBiz - Online Butik Alışveriş" />
        <meta property="og:description" content="ButikBiz - Online mağazalar ve ürünler. Butik alışverişin yeni adresi." />
        <meta property="og:image" content="https://butikbiz.com/icon-512.png" />
        <meta property="og:url" content="https://butikbiz.com" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ButikBiz" />
        <meta property="og:locale" content="tr_TR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ButikBiz - Online Butik Alışveriş" />
        <meta name="twitter:description" content="ButikBiz - Online mağazalar ve ürünler. Butik alışverişin yeni adresi." />
        <meta name="twitter:image" content="https://butikbiz.com/icon-512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ButikBiz" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-512.png" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-512.png" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
