import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hamburguesas Estefany - Sistema POS",
  description: "Sistema de punto de venta para Hamburguesas Estefany",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <footer className="footer-amor">
          <p>Desarrollado con ❤️ por el novio de Estefany</p>
        </footer>
      </body>
    </html>
  );
}
