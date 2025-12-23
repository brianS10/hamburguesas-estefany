export interface Categoria {
  id: number;
  nombre: string;
}

export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  categoria_id: number;
  imagen_url?: string;
  // Para joins
  categorias?: Categoria;
}

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  subtotal: number;
}

export interface Venta {
  id?: number;
  fecha?: string;
  total_venta: number;
  pago_con: number;
  cambio: number;
  metodo_pago: 'Efectivo' | 'Tarjeta' | 'Transferencia';
}

export interface DetalleVenta {
  id?: number;
  venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
}
