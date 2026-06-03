import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";

const serviceWorkerScript =
  process.env.NODE_ENV === "production"
    ? `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    `
    : `
      (function () {
        if (!('serviceWorker' in navigator)) return;

        var isLocalhost =
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname === '[::1]';

        if (!isLocalhost) return;

        navigator.serviceWorker.getRegistrations()
          .then(function (registrations) {
            return Promise.all(registrations.map(function (registration) {
              return registration.unregister().catch(function () {});
            }));
          })
          .catch(function () {});

        if ('caches' in window) {
          caches.keys()
            .then(function (cacheNames) {
              return Promise.all(cacheNames.map(function (cacheName) {
                return caches.delete(cacheName).catch(function () {});
              }));
            })
            .catch(function () {});
        }
      })();
    `;

export const metadata: Metadata = {
  title: "سامانه تخفیف درمانی | حامی کارت",
  description: "سامانه جامع تخفیف خدمات درمانی - خرید طرح تخفیف، ویزیت پزشک با تخفیف ویژه تا ۴۰ درصد",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-32.png",
    apple: "/icon-180.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "حامی کارت",
    "theme-color": "#059669",
    "msapplication-TileColor": "#059669",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa-IR" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen">
        <script
          dangerouslySetInnerHTML={{
            __html: serviceWorkerScript,
          }}
        />
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
