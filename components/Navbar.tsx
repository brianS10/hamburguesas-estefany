"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, BarChart3 } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/ventas", label: "Ventas", icon: ShoppingCart },
    { href: "/reportes", label: "Reportes", icon: BarChart3 },
  ];

  return (
    <nav className="bg-dark-light border-b border-dark-lighter sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🍔</span>
            <span className="font-bold text-primary hidden sm:block">
              Hamburguesas Estefany
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                  ${
                    pathname === link.href
                      ? "bg-primary text-white"
                      : "text-gray-400 hover:text-white hover:bg-dark-lighter"
                  }`}
              >
                <link.icon className="w-5 h-5" />
                <span className="hidden sm:block">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
