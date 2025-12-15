import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';
const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AdSense Ifrit - Autonomous Tech & Finance Insights",
    template: "%s | AdSense Ifrit"
  },
  description: "Automated insights powered by AI for the modern era. Finance, technology, and trending topics analyzed with expert depth.",
  keywords: ["AI content", "finance", "technology", "trends", "automation", "personal finance", "tech reviews"],
  authors: [{ name: "AdSense Ifrit" }],
  creator: "AdSense Ifrit",
  publisher: "AdSense Ifrit",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'AdSense Ifrit',
    title: 'AdSense Ifrit - Autonomous Tech & Finance Insights',
    description: 'Automated insights powered by AI for the modern era. Expert analysis of finance and technology trends.',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'AdSense Ifrit - AI-Powered Content',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdSense Ifrit - Autonomous Tech & Finance Insights',
    description: 'Automated insights powered by AI for the modern era.',
    images: [`${siteUrl}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    // Add your verification codes here
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "AdSense Ifrit",
              "url": siteUrl,
              "description": "AI-powered autonomous content engine for tech and finance insights.",
              "sameAs": []
            })
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {adsenseId && (
          <Script
            id="adsense-init"
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
          />
        )}
        {children}
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="5a9b6823-6abe-4a51-a0d5-8deb4dd8c3a5"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
