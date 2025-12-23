import { supabase } from './supabase';
import { Producto, Categoria } from '@/types';

const DB_NAME = 'HamburguesasEstefanyDB';
const DB_VERSION = 1;

interface VentaPendiente {
  id?: number;
  total_venta: number;
  pago_con: number;
  cambio: number;
  metodo_pago: string;
  fecha: string;
  detalles: {
    producto_id: number;
    cantidad: number;
    precio_unitario: number;
  }[];
  sincronizado: number;
}

// Abrir conexión a IndexedDB
function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('ventasPendientes')) {
        const store = db.createObjectStore('ventasPendientes', { keyPath: 'id', autoIncrement: true });
        store.createIndex('sincronizado', 'sincronizado', { unique: false });
      }

      if (!db.objectStoreNames.contains('productos')) {
        db.createObjectStore('productos', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('categorias')) {
        db.createObjectStore('categorias', { keyPath: 'id' });
      }
    };
  });
}

// Guardar venta pendiente (offline)
export async function guardarVentaOffline(venta: Omit<VentaPendiente, 'id' | 'sincronizado'>): Promise<number> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('ventasPendientes', 'readwrite');
    const store = transaction.objectStore('ventasPendientes');
    
    const ventaConEstado = {
      ...venta,
      sincronizado: 0,
    };
    
    const request = store.add(ventaConEstado);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

// Obtener ventas pendientes de sincronizar
export async function obtenerVentasPendientes(): Promise<VentaPendiente[]> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('ventasPendientes', 'readonly');
    const store = transaction.objectStore('ventasPendientes');
    const index = store.index('sincronizado');
    const request = index.getAll(IDBKeyRange.only(0));
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Eliminar venta sincronizada
export async function eliminarVentaSincronizada(id: number): Promise<void> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('ventasPendientes', 'readwrite');
    const store = transaction.objectStore('ventasPendientes');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Sincronizar ventas pendientes con Supabase
export async function sincronizarVentas(): Promise<{ sincronizadas: number; errores: number }> {
  const pendientes = await obtenerVentasPendientes();
  let sincronizadas = 0;
  let errores = 0;

  for (const venta of pendientes) {
    try {
      const { data: ventaDB, error: errorVenta } = await supabase
        .from('ventas')
        .insert({
          total_venta: venta.total_venta,
          pago_con: venta.pago_con,
          cambio: venta.cambio,
          metodo_pago: venta.metodo_pago,
          fecha: venta.fecha,
        })
        .select()
        .single();

      if (errorVenta) throw errorVenta;

      const detalles = venta.detalles.map(d => ({
        venta_id: ventaDB.id,
        producto_id: d.producto_id,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
      }));

      const { error: errorDetalles } = await supabase
        .from('detalle_ventas')
        .insert(detalles);

      if (errorDetalles) throw errorDetalles;

      await eliminarVentaSincronizada(venta.id!);
      sincronizadas++;
    } catch (error) {
      console.error('Error sincronizando venta:', venta.id, error);
      errores++;
    }
  }

  return { sincronizadas, errores };
}

// Verificar si hay conexión
export function hayConexion(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

// Guardar productos en cache offline
export async function cachearProductos(productos: Producto[]): Promise<void> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('productos', 'readwrite');
    const store = transaction.objectStore('productos');
    
    store.clear();
    productos.forEach(p => store.add(p));
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Obtener productos de cache offline
export async function obtenerProductosOffline(): Promise<Producto[]> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('productos', 'readonly');
    const store = transaction.objectStore('productos');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result as Producto[]);
    request.onerror = () => reject(request.error);
  });
}

// Guardar categorías en cache offline
export async function cachearCategorias(categorias: Categoria[]): Promise<void> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('categorias', 'readwrite');
    const store = transaction.objectStore('categorias');
    
    store.clear();
    categorias.forEach(c => store.add(c));
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Obtener categorías de cache offline
export async function obtenerCategoriasOffline(): Promise<Categoria[]> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('categorias', 'readonly');
    const store = transaction.objectStore('categorias');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result as Categoria[]);
    request.onerror = () => reject(request.error);
  });
}

// Contar ventas pendientes
export async function contarVentasPendientes(): Promise<number> {
  try {
    const pendientes = await obtenerVentasPendientes();
    return pendientes.length;
  } catch {
    return 0;
  }
}
