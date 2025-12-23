import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hamburguesas Estefany - Sistema POS",
  description: "Sistema de punto de venta para Hamburguesas Estefany",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hamburguesas Estefany",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6B35",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/logo_estefany.jpg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <footer className="footer-amor">
          <p>Desarrollado con ❤️ por el novio de Estefany</p>
        </footer>

        {/* Registrar Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((reg) => console.log('✅ Service Worker registrado'))
                    .catch((err) => console.log('❌ Error SW:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
