'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface VentaReporte {
  id: number;
  fecha: string;
  total_venta: number;
  pago_con: number;
  cambio: number;
  metodo_pago: string;
}

interface DetalleVenta {
  id: number;
  venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  productos?: { nombre: string };
}

interface ProductoVendido {
  nombre: string;
  cantidad: number;
  total: number;
}

export default function PaginaReportes() {
  const [ventas, setVentas] = useState<VentaReporte[]>([]);
  const [detalles, setDetalles] = useState<DetalleVenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('hoy');
  const [ventaSeleccionada, setVentaSeleccionada] = useState<number | null>(null);
  const [detallesVenta, setDetallesVenta] = useState<DetalleVenta[]>([]);
  const [vistaActiva, setVistaActiva] = useState<'resumen' | 'historial' | 'productos'>('resumen');

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const { data: ventasData } = await supabase.from('ventas').select('*').order('fecha', { ascending: false });
    const { data: detallesData } = await supabase.from('detalle_ventas').select('*, productos(nombre)');
    setVentas(ventasData || []);
    setDetalles(detallesData || []);
    setCargando(false);
  };

  const verDetallesVenta = async (ventaId: number) => {
    if (ventaSeleccionada === ventaId) {
      setVentaSeleccionada(null);
      setDetallesVenta([]);
      return;
    }
    const { data } = await supabase.from('detalle_ventas').select('*, productos(nombre)').eq('venta_id', ventaId);
    setVentaSeleccionada(ventaId);
    setDetallesVenta(data || []);
  };

  const eliminarVenta = async (id: number) => {
    if (!confirm(`¿Eliminar venta #${id}?`)) return;
    setEliminando(id);
    try {
      await supabase.from('detalle_ventas').delete().eq('venta_id', id);
      await supabase.from('ventas').delete().eq('id', id);
      setVentas(ventas.filter(v => v.id !== id));
      if (ventaSeleccionada === id) {
        setVentaSeleccionada(null);
        setDetallesVenta([]);
      }
      cargarDatos();
    } catch (error) {
      alert('❌ Error al eliminar');
    } finally {
      setEliminando(null);
    }
  };

  const filtrarVentas = () => {
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    return ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      switch (filtroFecha) {
        case 'hoy': return fechaVenta >= hoy;
        case 'semana':
          const inicioSemana = new Date(hoy);
          inicioSemana.setDate(hoy.getDate() - 7);
          return fechaVenta >= inicioSemana;
        case 'mes':
          const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
          return fechaVenta >= inicioMes;
        default: return true;
      }
    });
  };

  const ventasFiltradas = filtrarVentas();
  const totalVentas = ventasFiltradas.reduce((t, v) => t + v.total_venta, 0);
  const cantidadVentas = ventasFiltradas.length;
  const promedioVenta = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;
  const ventasEfectivo = ventasFiltradas.filter(v => v.metodo_pago === 'Efectivo').reduce((t, v) => t + v.total_venta, 0);
  const ventasTarjeta = ventasFiltradas.filter(v => v.metodo_pago === 'Tarjeta').reduce((t, v) => t + v.total_venta, 0);
  const ventasTransferencia = ventasFiltradas.filter(v => v.metodo_pago === 'Transferencia').reduce((t, v) => t + v.total_venta, 0);

  const productosVendidos: ProductoVendido[] = [];
  const ventaIds = ventasFiltradas.map(v => v.id);
  detalles.filter(d => ventaIds.includes(d.venta_id)).forEach(d => {
    const nombre = d.productos?.nombre || 'Producto';
    const existente = productosVendidos.find(p => p.nombre === nombre);
    if (existente) {
      existente.cantidad += d.cantidad;
      existente.total += d.cantidad * d.precio_unitario;
    } else {
      productosVendidos.push({ nombre, cantidad: d.cantidad, total: d.cantidad * d.precio_unitario });
    }
  });
  productosVendidos.sort((a, b) => b.cantidad - a.cantidad);

  if (cargando) return (
    <main className="pagina"><div className="pantalla-carga"><div className="spinner"></div><p>Cargando...</p></div></main>
  );

  return (
    <main className="reporte-page">
      {/* Header */}
      <header className="reporte-header">
        <a href="/" className="reporte-back">←</a>
        <div className="reporte-title">
          <Image src="/logo_estefany.jpg" alt="Logo" width={40} height={40} className="reporte-logo" />
          <h1>Reportes</h1>
        </div>
        <button onClick={cargarDatos} className="reporte-refresh">🔄</button>
      </header>

      {/* Filtros de fecha */}
      <div className="filtros-fecha">
        {(['hoy', 'semana', 'mes', 'todo'] as const).map(f => (
          <button key={f} onClick={() => setFiltroFecha(f)} className={`filtro-f ${filtroFecha === f ? 'activo' : ''}`}>
            {f === 'hoy' ? '📅 Hoy' : f === 'semana' ? '📆 7 días' : f === 'mes' ? '🗓️ Mes' : '📋 Todo'}
          </button>
        ))}
      </div>

      {/* Tabs de vista */}
      <div className="vista-tabs">
        <button onClick={() => setVistaActiva('resumen')} className={`vista-tab ${vistaActiva === 'resumen' ? 'activo' : ''}`}>
          💰 Resumen
        </button>
        <button onClick={() => setVistaActiva('historial')} className={`vista-tab ${vistaActiva === 'historial' ? 'activo' : ''}`}>
          🧾 Historial
        </button>
        <button onClick={() => setVistaActiva('productos')} className={`vista-tab ${vistaActiva === 'productos' ? 'activo' : ''}`}>
          🏆 Top
        </button>
      </div>

      {/* Vista Resumen */}
      {vistaActiva === 'resumen' && (
        <div className="resumen-mobile">
          <div className="stat-card principal">
            <span className="stat-icon">💰</span>
            <div className="stat-info">
              <span className="stat-label">Total Ventas</span>
              <span className="stat-valor">${totalVentas.toFixed(2)}</span>
              <span className="stat-sub">{cantidadVentas} ventas</span>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon">🧾</span>
              <div className="stat-info">
                <span className="stat-label">Promedio</span>
                <span className="stat-valor">${promedioVenta.toFixed(0)}</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">💵</span>
              <div className="stat-info">
                <span className="stat-label">Efectivo</span>
                <span className="stat-valor">${ventasEfectivo.toFixed(0)}</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">💳</span>
              <div className="stat-info">
                <span className="stat-label">Tarjeta</span>
                <span className="stat-valor">${ventasTarjeta.toFixed(0)}</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📱</span>
              <div className="stat-info">
                <span className="stat-label">Transfer</span>
                <span className="stat-valor">${ventasTransferencia.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista Historial */}
      {vistaActiva === 'historial' && (
        <div className="historial-mobile">
          {ventasFiltradas.length === 0 ? (
            <div className="estado-vacio">
              <span className="emoji-grande">📊</span>
              <h3>No hay ventas</h3>
            </div>
          ) : (
            ventasFiltradas.map(venta => (
              <div key={venta.id} className={`venta-card ${ventaSeleccionada === venta.id ? 'expandida' : ''}`}>
                <div className="venta-main" onClick={() => verDetallesVenta(venta.id)}>
                  <div className="venta-left">
                    <span className="venta-metodo">
                      {venta.metodo_pago === 'Efectivo' ? '💵' : venta.metodo_pago === 'Tarjeta' ? '💳' : '📱'}
                    </span>
                    <div className="venta-data">
                      <span className="venta-id">Venta #{venta.id}</span>
                      <span className="venta-fecha">
                        {new Date(venta.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} 
                        {' '}
                        {new Date(venta.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="venta-right">
                    <span className="venta-total">${venta.total_venta}</span>
                    <span className="venta-arrow">{ventaSeleccionada === venta.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {ventaSeleccionada === venta.id && (
                  <div className="venta-detalles">
                    {detallesVenta.map(d => (
                      <div key={d.id} className="detalle-row">
                        <span>{d.cantidad}x {d.productos?.nombre}</span>
                        <span>${(d.cantidad * d.precio_unitario).toFixed(2)}</span>
                      </div>
                    ))}
                    {venta.metodo_pago === 'Efectivo' && venta.cambio > 0 && (
                      <div className="detalle-row cambio-row">
                        <span>Cambio</span>
                        <span>${venta.cambio}</span>
                      </div>
                    )}
                    <button onClick={() => eliminarVenta(venta.id)} className="btn-eliminar-venta" disabled={eliminando === venta.id}>
                      {eliminando === venta.id ? '⏳ Eliminando...' : '🗑️ Eliminar venta'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Vista Productos */}
      {vistaActiva === 'productos' && (
        <div className="productos-top">
          {productosVendidos.length === 0 ? (
            <div className="estado-vacio">
              <span className="emoji-grande">🏆</span>
              <h3>Sin datos</h3>
            </div>
          ) : (
            productosVendidos.slice(0, 10).map((prod, i) => (
              <div key={prod.nombre} className="top-item">
                <span className={`top-pos ${i < 3 ? 'top3' : ''}`}>#{i + 1}</span>
                <div className="top-info">
                  <span className="top-nombre">{prod.nombre}</span>
                  <span className="top-cantidad">{prod.cantidad} vendidos</span>
                </div>
                <span className="top-total">${prod.total.toFixed(0)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
