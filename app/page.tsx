'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Producto, Categoria, ItemCarrito } from '@/types';
import { supabase } from '@/lib/supabase';
import {
  guardarVentaOffline,
  sincronizarVentas,
  hayConexion,
  cachearProductos,
  cachearCategorias,
  obtenerProductosOffline,
  obtenerCategoriasOffline,
  contarVentasPendientes,
} from '@/lib/offlineDB';

export default function PaginaPrincipal() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);
  const [efectivoRecibido, setEfectivoRecibido] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo');
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState<{ total: number; cambio: number; offline?: boolean } | null>(null);
  const [online, setOnline] = useState(true);
  const [ventasPendientes, setVentasPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  // Verificar conexión
  useEffect(() => {
    setOnline(hayConexion());
    
    const handleOnline = () => {
      setOnline(true);
      sincronizarPendientes();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cargar datos
  useEffect(() => { 
    cargarDatos(); 
    actualizarContadorPendientes();
  }, []);

  const actualizarContadorPendientes = async () => {
    const count = await contarVentasPendientes();
    setVentasPendientes(count);
  };

  const sincronizarPendientes = useCallback(async () => {
    if (sincronizando || !hayConexion()) return;
    
    setSincronizando(true);
    try {
      const { sincronizadas, errores } = await sincronizarVentas();
      if (sincronizadas > 0) {
        console.log(`✅ ${sincronizadas} ventas sincronizadas`);
      }
      if (errores > 0) {
        console.log(`⚠️ ${errores} ventas con error`);
      }
      await actualizarContadorPendientes();
    } catch (error) {
      console.error('Error sincronizando:', error);
    } finally {
      setSincronizando(false);
    }
  }, [sincronizando]);

  const cargarDatos = async () => {
    try {
      if (hayConexion()) {
        // Cargar de Supabase
        const { data: cats } = await supabase.from('categorias').select('*').order('id');
        const { data: prods } = await supabase.from('productos').select('*, categorias(nombre)').order('nombre');
        
        setCategorias(cats || []);
        setProductos(prods || []);

        // Guardar en cache offline
        if (cats) await cachearCategorias(cats);
        if (prods) await cachearProductos(prods);

        // Sincronizar ventas pendientes
        sincronizarPendientes();
      } else {
        // Cargar de cache offline
        const cats = await obtenerCategoriasOffline();
        const prods = await obtenerProductosOffline();
        
        setCategorias(cats);
        setProductos(prods);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      // Intentar cargar de cache
      const cats = await obtenerCategoriasOffline();
      const prods = await obtenerProductosOffline();
      setCategorias(cats);
      setProductos(prods);
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
  const totalItems = carrito.reduce((t, i) => t + i.cantidad, 0);
  const efectivo = parseFloat(efectivoRecibido) || 0;
  const cambio = efectivo - totalVenta;

  const procesarVenta = async () => {
    if (carrito.length === 0) return;
    if (metodoPago === 'Efectivo' && efectivo < totalVenta) {
      alert('💵 El efectivo es insuficiente');
      return;
    }

    setGuardando(true);
    
    const ventaData = {
      total_venta: totalVenta,
      pago_con: metodoPago === 'Efectivo' ? efectivo : totalVenta,
      cambio: metodoPago === 'Efectivo' ? cambio : 0,
      metodo_pago: metodoPago,
      fecha: new Date().toISOString(),
      detalles: carrito.map(item => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio
      }))
    };

    try {
      if (hayConexion()) {
        // Guardar en Supabase
        const { data: venta, error: errorVenta } = await supabase
          .from('ventas')
          .insert({
            total_venta: ventaData.total_venta,
            pago_con: ventaData.pago_con,
            cambio: ventaData.cambio,
            metodo_pago: ventaData.metodo_pago
          })
          .select()
          .single();

        if (errorVenta) throw errorVenta;

        const detalles = ventaData.detalles.map(d => ({
          venta_id: venta.id,
          producto_id: d.producto_id,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario
        }));

        const { error: errorDetalles } = await supabase.from('detalle_ventas').insert(detalles);
        if (errorDetalles) throw errorDetalles;

        setVentaExitosa({ total: totalVenta, cambio: metodoPago === 'Efectivo' ? cambio : 0 });
      } else {
        // Guardar offline
        await guardarVentaOffline(ventaData);
        await actualizarContadorPendientes();
        setVentaExitosa({ total: totalVenta, cambio: metodoPago === 'Efectivo' ? cambio : 0, offline: true });
      }
      
      setCarrito([]);
      setEfectivoRecibido('');
      setMostrarCarrito(false);
      setTimeout(() => setVentaExitosa(null), 3500);
    } catch (error) {
      console.error('Error:', error);
      // Si falla, guardar offline
      try {
        await guardarVentaOffline(ventaData);
        await actualizarContadorPendientes();
        setVentaExitosa({ total: totalVenta, cambio: metodoPago === 'Efectivo' ? cambio : 0, offline: true });
        setCarrito([]);
        setEfectivoRecibido('');
        setMostrarCarrito(false);
        setTimeout(() => setVentaExitosa(null), 3500);
      } catch (offlineError) {
        alert('❌ Error al guardar la venta');
      }
    } finally {
      setGuardando(false);
    }
  };

  const EMOJIS_CONOCIDOS = ['🍔', '🍗', '🌮', '🌯', '🥤', '🍟', '🍕', '🌭', '🥗', '🍰', '🍦', '☕', '🧃', '🥪', '🍱', '🍳', '🥓', '🧀', '🍽️'];

  const obtenerEmoji = (nombreCat: string): string => {
    if (!nombreCat) return '🍽️';
    
    // Obtener el primer caracter/emoji del nombre
    const primerCaracter = [...nombreCat][0];
    
    // Lista de emojis válidos
    const emojisValidos = '🍔🍗🌮🌯🥤🍟🍕🌭🥗🍰🍦☕🧃🥪🍱🍳🥓🧀🍽️';
    
    if (emojisValidos.includes(primerCaracter)) {
      return primerCaracter;
    }
    
    // Fallback para categorías sin emoji
    const fallbacks: Record<string, string> = {
      'Hamburguesas': '🍔',
      'Alitas': '🍗',
      'Tacos': '🌮',
      'Bebidas': '🥤',
      'Extras': '🍟',
      'Postres': '🍰',
      'Combos': '🍱'
    };
    
    return fallbacks[nombreCat] || '🍽️';
  };

  const obtenerNombreSinEmoji = (nombreCat: string): string => {
    if (!nombreCat) return '';
    
    const emojisValidos = '🍔🍗🌮🌯🥤🍟🍕🌭🥗🍰🍦☕🧃🥪🍱🍳🥓🧀🍽️';
    const primerCaracter = [...nombreCat][0];
    
    if (emojisValidos.includes(primerCaracter)) {
      return nombreCat.slice(primerCaracter.length).trim();
    }
    
    return nombreCat;
  };

  if (cargando) {
    return (
      <main className="pantalla-carga">
        <Image src="/logo_estefany.jpg" alt="Logo" width={150} height={150} className="logo-carga" />
        <div className="spinner"></div>
        <p>Cargando...</p>
      </main>
    );
  }

  return (
    <main className="app-mobile">
      {/* Indicador de estado de conexión */}
      {!online && (
        <div className="offline-banner">
          📡 Modo Offline - Las ventas se sincronizarán al volver la conexión
        </div>
      )}

      {/* Indicador de ventas pendientes */}
      {ventasPendientes > 0 && online && (
        <div className="sync-banner" onClick={sincronizarPendientes}>
          {sincronizando ? '⏳ Sincronizando...' : `🔄 ${ventasPendientes} venta(s) pendiente(s) - Toca para sincronizar`}
        </div>
      )}

      {/* Confirmación de venta exitosa */}
      {ventaExitosa && (
        <div className="venta-exitosa-overlay">
          <div className="venta-exitosa-modal">
            <div className="exitosa-icon">{ventaExitosa.offline ? '📱' : '✅'}</div>
            <h2>{ventaExitosa.offline ? '¡Guardado Offline!' : '¡Venta Exitosa!'}</h2>
            {ventaExitosa.offline && (
              <p className="offline-msg">Se sincronizará cuando haya conexión</p>
            )}
            <div className="exitosa-detalles">
              <div className="exitosa-row">
                <span>Total:</span>
                <strong>${ventaExitosa.total.toFixed(2)}</strong>
              </div>
              {ventaExitosa.cambio > 0 && (
                <div className="exitosa-row cambio">
                  <span>Cambio:</span>
                  <strong>${ventaExitosa.cambio.toFixed(2)}</strong>
                </div>
              )}
            </div>
            <div className="exitosa-check">
              <svg viewBox="0 0 52 52" className="checkmark">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Header móvil */}
      <header className="header-mobile">
        <div className="header-logo">
          <Image src="/logo_estefany.jpg" alt="Logo" width={50} height={50} className="logo-mini" />
          <span>Hamburguesas<br/>Estefany</span>
          {!online && <span className="status-dot offline"></span>}
        </div>
        <nav className="nav-mobile">
          <a href="/categorias" className="nav-btn">🏷️</a>
          <a href="/productos" className="nav-btn">📦</a>
          <a href="/reportes" className="nav-btn">📊</a>
        </nav>
      </header>

      {/* Categorías */}
      <div className="categorias-scroll">
        <button
          onClick={() => setCategoriaSeleccionada(null)}
          className={`chip-cat ${categoriaSeleccionada === null ? 'activo' : ''}`}
        >
          🍽️ Todo
        </button>
        {categorias.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoriaSeleccionada(cat.id)}
            className={`chip-cat ${categoriaSeleccionada === cat.id ? 'activo' : ''}`}
          >
            {obtenerEmoji(cat.nombre)} {obtenerNombreSinEmoji(cat.nombre)}
          </button>
        ))}
      </div>

      {/* Productos */}
      <section className="productos-mobile">
        {productos.length === 0 ? (
          <div className="estado-vacio">
            <span className="emoji-grande">📦</span>
            <h3>No hay productos</h3>
            <a href="/productos" className="boton-primario">➕ Agregar</a>
          </div>
        ) : (
          <div className="grid-mobile">
            {productosFiltrados.map(producto => (
              <button 
                key={producto.id} 
                className="producto-card"
                onClick={() => agregarAlCarrito(producto)}
              >
                <span className="prod-emoji">{obtenerEmoji(producto.categorias?.nombre || '')}</span>
                <span className="prod-nombre">{producto.nombre}</span>
                <span className="prod-precio">${producto.precio}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Botón flotante del carrito */}
      {totalItems > 0 && !mostrarCarrito && (
        <button className="fab-carrito" onClick={() => setMostrarCarrito(true)}>
          <span className="fab-emoji">🛒</span>
          <span className="fab-total">${totalVenta}</span>
          <span className="fab-badge">{totalItems}</span>
        </button>
      )}

      {/* Panel del carrito (modal en móvil) */}
      {mostrarCarrito && (
        <div className="carrito-overlay" onClick={() => setMostrarCarrito(false)}>
          <div className="carrito-modal" onClick={e => e.stopPropagation()}>
            <div className="carrito-modal-header">
              <h2>🛒 Tu Orden</h2>
              <button onClick={() => setMostrarCarrito(false)} className="btn-cerrar">✕</button>
            </div>

            <div className="carrito-modal-items">
              {carrito.map(item => (
                <div key={item.producto.id} className="item-mobile">
                  <div className="item-mobile-info">
                    <span className="item-mobile-nombre">{item.producto.nombre}</span>
                    <span className="item-mobile-precio">${item.producto.precio} c/u</span>
                  </div>
                  <div className="item-mobile-row">
                    <div className="item-mobile-controles">
                      <button onClick={() => quitarDelCarrito(item.producto.id)} className="btn-ctrl">−</button>
                      <span className="item-mobile-cant">{item.cantidad}</span>
                      <button onClick={() => agregarAlCarrito(item.producto)} className="btn-ctrl">+</button>
                    </div>
                    <div className="item-mobile-subtotal">
                      <span>${item.subtotal}</span>
                      <button onClick={() => eliminarDelCarrito(item.producto.id)} className="btn-borrar">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="carrito-modal-footer">
              <div className="metodo-pago-mobile">
                <span>Pago:</span>
                <div className="metodos-mobile">
                  {(['Efectivo', 'Tarjeta', 'Transferencia'] as const).map(m => (
                    <button key={m} onClick={() => setMetodoPago(m)} className={`metodo-m ${metodoPago === m ? 'activo' : ''}`}>
                      {m === 'Efectivo' ? '💵' : m === 'Tarjeta' ? '💳' : '📱'}
                    </button>
                  ))}
                </div>
              </div>

              {metodoPago === 'Efectivo' && (
                <div className="efectivo-mobile">
                  <label>Paga con: $</label>
                  <input type="number" value={efectivoRecibido} onChange={(e) => setEfectivoRecibido(e.target.value)} placeholder="0" />
                  {efectivo >= totalVenta && efectivo > 0 && (
                    <span className="cambio-mobile">Cambio: ${cambio.toFixed(2)}</span>
                  )}
                </div>
              )}

              <div className="total-mobile">
                <span>TOTAL</span>
                <strong>${totalVenta.toFixed(2)}</strong>
              </div>

              <div className="btns-mobile">
                <button onClick={() => { setCarrito([]); setMostrarCarrito(false); }} className="btn-cancel-m">🗑️</button>
                <button onClick={procesarVenta} className="btn-cobrar-m" disabled={guardando || (metodoPago === 'Efectivo' && efectivo < totalVenta)}>
                  {guardando ? '⏳' : online ? '💰 Cobrar' : '📱 Guardar Offline'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar y carrito desktop */}
      <aside className="sidebar-desktop">
        <div className="sidebar-header">
          <Image src="/logo_estefany.jpg" alt="Logo" width={100} height={100} className="logo" />
          <h1>Hamburguesas<br/>Estefany</h1>
        </div>
        <nav className="sidebar-nav">
          <a href="/" className="nav-item activo">🏠 Ventas</a>
          <a href="/productos" className="nav-item">📦 Productos</a>
          <a href="/categorias" className="nav-item">🏷️ Categorías</a>
          <a href="/reportes" className="nav-item">📊 Reportes</a>
        </nav>
        <div className="sidebar-footer">
          <p>{online ? '🟢 Conectado' : '🔴 Offline'}</p>
        </div>
      </aside>

      <aside className="carrito-desktop">
        <div className="carrito-header">
          <h2>🛒 Orden</h2>
          <span className="carrito-count">{totalItems}</span>
        </div>

        <div className="carrito-items">
          {carrito.length === 0 ? (
            <div className="carrito-vacio"><span>🛒</span><p>Carrito vacío</p></div>
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
                  <span>${item.subtotal}</span>
                  <button onClick={() => eliminarDelCarrito(item.producto.id)} className="btn-eliminar">×</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="carrito-footer">
          <div className="metodo-pago">
            <label>Pago:</label>
            <div className="metodo-opciones">
              {(['Efectivo', 'Tarjeta', 'Transferencia'] as const).map(m => (
                <button key={m} onClick={() => setMetodoPago(m)} className={`metodo-btn ${metodoPago === m ? 'activo' : ''}`}>
                  {m === 'Efectivo' ? '💵' : m === 'Tarjeta' ? '💳' : '📱'}
                </button>
              ))}
            </div>
          </div>

          {metodoPago === 'Efectivo' && (
            <div className="campo-pago">
              <label>💵 Paga con:</label>
              <div className="input-pago">
                <span>$</span>
                <input type="number" value={efectivoRecibido} onChange={(e) => setEfectivoRecibido(e.target.value)} placeholder="0" />
              </div>
              {efectivo >= totalVenta && efectivo > 0 && (
                <div className="cambio"><span>Cambio:</span><strong>${cambio.toFixed(2)}</strong></div>
              )}
            </div>
          )}

          <div className="total-venta">
            <span>TOTAL</span>
            <strong>${totalVenta.toFixed(2)}</strong>
          </div>

          <div className="botones-carrito">
            <button onClick={() => { setCarrito([]); setEfectivoRecibido(''); }} className="btn-cancelar" disabled={carrito.length === 0}>🗑️</button>
            <button onClick={procesarVenta} className="btn-cobrar" disabled={guardando || carrito.length === 0 || (metodoPago === 'Efectivo' && efectivo < totalVenta)}>
              {guardando ? '⏳' : online ? '💰 COBRAR' : '📱 OFFLINE'}
            </button>
          </div>
        </div>
      </aside>

      {/* Footer amor móvil */}
      <footer className="footer-amor-mobile">
        <p>hecho con <span>♥</span> por el novio de Estefany</p>
      </footer>
    </main>
  );
}
