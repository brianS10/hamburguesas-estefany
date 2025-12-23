'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Producto, Categoria, ItemCarrito } from '@/types';
import { supabase } from '@/lib/supabase';

export default function PaginaPrincipal() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);
  const [efectivoRecibido, setEfectivoRecibido] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo');

  // Cargar productos y categorías al iniciar
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // Cargar categorías
      const { data: cats } = await supabase
        .from('categorias')
        .select('*')
        .order('id');
      
      // Cargar productos
      const { data: prods } = await supabase
        .from('productos')
        .select('*, categorias(nombre)')
        .order('nombre');

      setCategorias(cats || []);
      setProductos(prods || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const productosFiltrados = categoriaSeleccionada === null
    ? productos 
    : productos.filter(p => p.categoria_id === categoriaSeleccionada);

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito(carritoActual => {
      const itemExistente = carritoActual.find(item => item.producto.id === producto.id);
      if (itemExistente) {
        return carritoActual.map(item =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.producto.precio }
            : item
        );
      }
      return [...carritoActual, { producto, cantidad: 1, subtotal: producto.precio }];
    });
  };

  const quitarDelCarrito = (productoId: number) => {
    setCarrito(carritoActual => {
      const itemExistente = carritoActual.find(item => item.producto.id === productoId);
      if (itemExistente && itemExistente.cantidad > 1) {
        return carritoActual.map(item =>
          item.producto.id === productoId
            ? { ...item, cantidad: item.cantidad - 1, subtotal: (item.cantidad - 1) * item.producto.precio }
            : item
        );
      }
      return carritoActual.filter(item => item.producto.id !== productoId);
    });
  };

  const eliminarDelCarrito = (productoId: number) => {
    setCarrito(carritoActual => carritoActual.filter(item => item.producto.id !== productoId));
  };

  const totalVenta = carrito.reduce((total, item) => total + item.subtotal, 0);
  const efectivo = parseFloat(efectivoRecibido) || 0;
  const cambio = efectivo - totalVenta;

  const procesarVenta = async () => {
    if (carrito.length === 0) return;
    if (metodoPago === 'Efectivo' && efectivo < totalVenta) {
      alert('💵 El efectivo es insuficiente');
      return;
    }

    setGuardando(true);
    try {
      // Guardar venta en Supabase
      const { data: venta, error: errorVenta } = await supabase
        .from('ventas')
        .insert({
          total_venta: totalVenta,
          pago_con: metodoPago === 'Efectivo' ? efectivo : totalVenta,
          cambio: metodoPago === 'Efectivo' ? cambio : 0,
          metodo_pago: metodoPago
        })
        .select()
        .single();

      if (errorVenta) throw errorVenta;

      // Guardar detalles de la venta
      const detalles = carrito.map(item => ({
        venta_id: venta.id,
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio
      }));

      const { error: errorDetalles } = await supabase
        .from('detalle_ventas')
        .insert(detalles);

      if (errorDetalles) throw errorDetalles;

      // Mostrar ticket
      const ticket = carrito.map(i => `${i.cantidad}x ${i.producto.nombre} = $${i.subtotal}`).join('\n');
      alert(`✅ ¡VENTA EXITOSA!\n\n${ticket}\n\n💰 Total: $${totalVenta}\n💵 Pagó: $${metodoPago === 'Efectivo' ? efectivo : totalVenta}\n🔄 Cambio: $${metodoPago === 'Efectivo' ? cambio.toFixed(2) : '0.00'}`);
      
      setCarrito([]);
      setEfectivoRecibido('');
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const obtenerEmoji = (nombre: string) => {
    const emojis: Record<string, string> = {
      'Hamburguesas': '🍔', 'Alitas': '🍗', 'Tacos': '🌮', 'Bebidas': '🥤', 'Extras': '🍟'
    };
    return emojis[nombre] || '🍽️';
  };

  if (cargando) {
    return (
      <main className="pantalla-carga">
        <Image src="/logo_estefany.jpg" alt="Logo" width={200} height={200} className="logo-carga" />
        <div className="spinner"></div>
        <p>Cargando...</p>
      </main>
    );
  }

  return (
    <main className="app">
      {/* Sidebar / Navegación */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Image src="/logo_estefany.jpg" alt="Hamburguesas Estefany" width={120} height={120} className="logo" />
          <h1>Hamburguesas<br/>Estefany</h1>
        </div>
        
        <nav className="sidebar-nav">
          <a href="/" className="nav-item activo">🏠 Ventas</a>
          <a href="/productos" className="nav-item">📦 Productos</a>
          <a href="/categorias" className="nav-item">🏷️ Categorías</a>
          <a href="/reportes" className="nav-item">📊 Reportes</a>
        </nav>

        <div className="sidebar-footer">
          <p>Sistema POS v1.0</p>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className="contenido-principal">
        {/* Filtros de categoría */}
        <header className="barra-categorias">
          <button
            onClick={() => setCategoriaSeleccionada(null)}
            className={`chip-categoria ${categoriaSeleccionada === null ? 'activo' : ''}`}
          >
            🍽️ Todos
          </button>
          {categorias.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoriaSeleccionada(cat.id)}
              className={`chip-categoria ${categoriaSeleccionada === cat.id ? 'activo' : ''}`}
            >
              {obtenerEmoji(cat.nombre)} {cat.nombre}
            </button>
          ))}
        </header>

        {/* Grid de productos */}
        <section className="grid-productos">
          {productos.length === 0 ? (
            <div className="estado-vacio">
              <span className="emoji-grande">📦</span>
              <h3>No hay productos</h3>
              <p>Agrega productos para empezar a vender</p>
              <a href="/productos" className="boton-primario">➕ Agregar Productos</a>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="estado-vacio">
              <span className="emoji-grande">🔍</span>
              <h3>Sin productos en esta categoría</h3>
            </div>
          ) : (
            productosFiltrados.map(producto => (
              <button 
                key={producto.id} 
                className="tarjeta-producto"
                onClick={() => agregarAlCarrito(producto)}
              >
                <span className="producto-emoji">{obtenerEmoji(producto.categorias?.nombre || '')}</span>
                <span className="producto-nombre">{producto.nombre}</span>
                <span className="producto-precio">${producto.precio}</span>
              </button>
            ))
          )}
        </section>
      </div>

      {/* Panel del Carrito */}
      <aside className="panel-carrito">
        <div className="carrito-header">
          <h2>🛒 Orden Actual</h2>
          <span className="carrito-count">{carrito.reduce((t, i) => t + i.cantidad, 0)}</span>
        </div>

        <div className="carrito-items">
          {carrito.length === 0 ? (
            <div className="carrito-vacio">
              <span className="emoji-grande">🛒</span>
              <p>Carrito vacío</p>
              <small>Selecciona productos del menú</small>
            </div>
          ) : (
            carrito.map(item => (
              <div key={item.producto.id} className="carrito-item">
                <div className="item-info">
                  <span className="item-nombre">{item.producto.nombre}</span>
                  <span className="item-precio">${item.producto.precio} c/u</span>
                </div>
                <div className="item-controles">
                  <button onClick={() => quitarDelCarrito(item.producto.id)} className="btn-cantidad">−</button>
                  <span className="item-cantidad">{item.cantidad}</span>
                  <button onClick={() => agregarAlCarrito(item.producto)} className="btn-cantidad">+</button>
                </div>
                <div className="item-subtotal">
                  <span>${item.subtotal.toFixed(2)}</span>
                  <button onClick={() => eliminarDelCarrito(item.producto.id)} className="btn-eliminar">×</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="carrito-footer">
          {/* Método de pago */}
          <div className="metodo-pago">
            <label>Método de pago:</label>
            <div className="metodo-opciones">
              {(['Efectivo', 'Tarjeta', 'Transferencia'] as const).map(metodo => (
                <button
                  key={metodo}
                  onClick={() => setMetodoPago(metodo)}
                  className={`metodo-btn ${metodoPago === metodo ? 'activo' : ''}`}
                >
                  {metodo === 'Efectivo' ? '💵' : metodo === 'Tarjeta' ? '💳' : '📱'}
                </button>
              ))}
            </div>
          </div>

          {/* Campo de efectivo */}
          {metodoPago === 'Efectivo' && (
            <div className="campo-pago">
              <label>💵 Paga con:</label>
              <div className="input-pago">
                <span>$</span>
                <input
                  type="number"
                  value={efectivoRecibido}
                  onChange={(e) => setEfectivoRecibido(e.target.value)}
                  placeholder="0"
                />
              </div>
              {efectivo >= totalVenta && efectivo > 0 && (
                <div className="cambio">
                  <span>Cambio:</span>
                  <strong>${cambio.toFixed(2)}</strong>
                </div>
              )}
            </div>
          )}

          {/* Total y botones */}
          <div className="total-venta">
            <span>TOTAL</span>
            <strong>${totalVenta.toFixed(2)}</strong>
          </div>

          <div className="botones-carrito">
            <button onClick={() => { setCarrito([]); setEfectivoRecibido(''); }} className="btn-cancelar" disabled={carrito.length === 0}>
              🗑️
            </button>
            <button 
              onClick={procesarVenta} 
              className="btn-cobrar"
              disabled={guardando || carrito.length === 0 || (metodoPago === 'Efectivo' && efectivo < totalVenta)}
            >
              {guardando ? '⏳...' : '💰 COBRAR'}
            </button>
          </div>
        </div>
      </aside>
    </main>
  );
}
