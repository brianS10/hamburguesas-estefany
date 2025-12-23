"use client";

import { Producto } from "@/types";
import { Plus } from "lucide-react";

interface ProductGridProps {
  productos: Producto[];
  onAddProduct: (producto: Producto) => void;
}

const iconosPorCategoria: Record<string, string> = {
  hamburguesa: "🍔",
  alitas: "🍗",
  tacos: "🌮",
  bebidas: "🥤",
};

export default function ProductGrid({ productos, onAddProduct }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {productos.map((producto) => (
        <button
          key={producto.id}
          onClick={() => onAddProduct(producto)}
          className="bg-dark-light border border-dark-lighter rounded-xl p-4
                     hover:border-primary hover:bg-dark-lighter transition-all
                     flex flex-col items-center gap-2 group"
        >
          <span className="text-4xl group-hover:scale-110 transition-transform">
            {iconosPorCategoria[producto.categoria] || "🍽️"}
          </span>
          <span className="font-medium text-white text-center text-sm">
            {producto.nombre}
          </span>
          <span className="text-primary font-bold">${producto.precio}</span>
          <div className="bg-primary/20 text-primary rounded-full p-1 
                          group-hover:bg-primary group-hover:text-white transition-all">
            <Plus className="w-4 h-4" />
          </div>
        </button>
      ))}
    </div>
  );
}
