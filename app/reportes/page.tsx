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

  useEffect(() => { 
    cargarDatos(); 
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    
    const { data: ventasData } = await supabase
      .from('ventas')
      .select('*')
      .order('fecha', { ascending: false });
    
    const { data: detallesData } = await supabase
      .from('detalle_ventas')
      .select('*, productos(nombre)');
    
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
    
    const { data } = await supabase
      .from('detalle_ventas')
      .select('*, productos(nombre)')
      .eq('venta_id', ventaId);
    
    setVentaSeleccionada(ventaId);
    setDetallesVenta(data || []);
  };

  const eliminarVenta = async (id: number) => {
    if (!confirm(`¿Eliminar venta #${id}?\n\nEsta acción no se puede deshacer.`)) return;
    
    setEliminando(id);
    try {
      await supabase.from('detalle_ventas').delete().eq('venta_id', id);
      const { error } = await supabase.from('ventas').delete().eq('id', id);
      if (error) throw error;
      
      setVentas(ventas.filter(v => v.id !== id));
      if (ventaSeleccionada === id) {
        setVentaSeleccionada(null);
        setDetallesVenta([]);
      }
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al eliminar');
    } finally {
      setEliminando(null);
    }
  };

  // Filtrar ventas por fecha
  const filtrarVentas = () => {
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    
    return ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      switch (filtroFecha) {
        case 'hoy':
          return fechaVenta >= hoy;
        case 'semana':
          const inicioSemana = new Date(hoy);
          inicioSemana.setDate(hoy.getDate() - 7);
          return fechaVenta >= inicioSemana;
        case 'mes':
          const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
          return fechaVenta >= inicioMes;
        default:
          return true;
      }
    });
  };

  const ventasFiltradas = filtrarVentas();

  // Estadísticas
  const totalVentas = ventasFiltradas.reduce((t, v) => t + v.total_venta, 0);
  const cantidadVentas = ventasFiltradas.length;
  const promedioVenta = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;
  
  const ventasEfectivo = ventasFiltradas.filter(v => v.metodo_pago === 'Efectivo').reduce((t, v) => t + v.total_venta, 0);
  const ventasTarjeta = ventasFiltradas.filter(v => v.metodo_pago === 'Tarjeta').reduce((t, v) => t + v.total_venta, 0);
  const ventasTransferencia = ventasFiltradas.filter(v => v.metodo_pago === 'Transferencia').reduce((t, v) => t + v.total_venta, 0);

  // Productos más vendidos
  const productosVendidos: ProductoVendido[] = [];
  const ventaIds = ventasFiltradas.map(v => v.id);
  
  detalles
    .filter(d => ventaIds.includes(d.venta_id))
    .forEach(d => {
      const nombre = d.productos?.nombre || 'Producto';
      const existente = productosVendidos.find(p => p.nombre === nombre);
      if (existente) {
        existente.cantidad += d.cantidad;
        existente.total += d.cantidad * d.precio_unitario;
      } else {
        productosVendidos.push({
          nombre,
          cantidad: d.cantidad,
          total: d.cantidad * d.precio_unitario
        });
      }
    });
  
  productosVendidos.sort((a, b) => b.cantidad - a.cantidad);

  if (cargando) return (
    <main className="pagina">
      <div className="pantalla-carga"><div className="spinner"></div><p>Cargando reportes...</p></div>
    </main>
  );

  return (
    <main className="pagina">
      <header className="pagina-header">
        <Image src="/logo_estefany.jpg" alt="Logo" width={70} height={70} className="logo" />
        <h1>📊 Reportes de Ventas</h1>
        <a href="/" className="btn-volver">← Volver</a>
      </header>

      {/* Filtros de fecha */}
      <div className="filtros-reporte">
        <button 
          onClick={() => setFiltroFecha('hoy')} 
          className={`filtro-btn ${filtroFecha === 'hoy' ? 'activo' : ''}`}
        >
          📅 Hoy
        </button>
        <button 
          onClick={() => setFiltroFecha('semana')} 
          className={`filtro-btn ${filtroFecha === 'semana' ? 'activo' : ''}`}
        >
          📆 Última Semana
        </button>
        <button 
          onClick={() => setFiltroFecha('mes')} 
          className={`filtro-btn ${filtroFecha === 'mes' ? 'activo' : ''}`}
        >
          🗓️ Este Mes
        </button>
        <button 
          onClick={() => setFiltroFecha('todo')} 
          className={`filtro-btn ${filtroFecha === 'todo' ? 'activo' : ''}`}
        >
          📋 Todo
        </button>
        <button onClick={cargarDatos} className="btn-refrescar">🔄 Actualizar</button>
      </div>

      {/* Resumen principal */}
      <div className="resumen-cards">
        <div className="resumen-card principal">
          <h3>💰 Total Ventas</h3>
          <p className="valor">${totalVentas.toFixed(2)}</p>
          <p className="subtexto">{cantidadVentas} ventas</p>
        </div>
        <div className="resumen-card">
          <h3>🧾 Promedio</h3>
          <p className="valor">${promedioVenta.toFixed(2)}</p>
          <p className="subtexto">por venta</p>
        </div>
        <div className="resumen-card">
          <h3>💵 Efectivo</h3>
          <p className="valor">${ventasEfectivo.toFixed(2)}</p>
          <p className="subtexto">{ventasFiltradas.filter(v => v.metodo_pago === 'Efectivo').length} ventas</p>
        </div>
        <div className="resumen-card">
          <h3>💳 Tarjeta</h3>
          <p className="valor">${ventasTarjeta.toFixed(2)}</p>
          <p className="subtexto">{ventasFiltradas.filter(v => v.metodo_pago === 'Tarjeta').length} ventas</p>
        </div>
        <div className="resumen-card">
          <h3>📱 Transferencia</h3>
          <p className="valor">${ventasTransferencia.toFixed(2)}</p>
          <p className="subtexto">{ventasFiltradas.filter(v => v.metodo_pago === 'Transferencia').length} ventas</p>
        </div>
      </div>

      {/* Productos más vendidos */}
      <section className="tabla-card">
        <div className="tabla-header">
          <h2>🏆 Productos Más Vendidos</h2>
        </div>
        {productosVendidos.length === 0 ? (
          <p className="sin-datos">No hay datos en este período</p>
        ) : (
          <div className="productos-ranking">
            {productosVendidos.slice(0, 10).map((prod, index) => (
              <div key={prod.nombre} className="ranking-item">
                <span className="ranking-pos">#{index + 1}</span>
                <span className="ranking-nombre">{prod.nombre}</span>
                <span className="ranking-cantidad">{prod.cantidad} vendidos</span>
                <span className="ranking-total">${prod.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Historial de ventas */}
      <section className="tabla-card">
        <div className="tabla-header">
          <h2>📋 Historial de Ventas ({ventasFiltradas.length})</h2>
        </div>
        
        {ventasFiltradas.length === 0 ? (
          <div className="estado-vacio">
            <span className="emoji-grande">📊</span>
            <h3>No hay ventas en este período</h3>
          </div>
        ) : (
          <div className="lista-ventas">
            {ventasFiltradas.map(venta => (
              <div key={venta.id} className={`venta-item ${ventaSeleccionada === venta.id ? 'expandida' : ''}`}>
                <div className="venta-resumen" onClick={() => verDetallesVenta(venta.id)}>
                  <div className="venta-info">
                    <span className="venta-id">#{venta.id}</span>
                    <span className="venta-fecha">
                      {new Date(venta.fecha).toLocaleDateString('es-MX', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="venta-metodo">
                    {venta.metodo_pago === 'Efectivo' ? '💵' : venta.metodo_pago === 'Tarjeta' ? '💳' : '📱'}
                  </div>
                  <div className="venta-montos">
                    <span className="venta-total">${venta.total_venta}</span>
                    {venta.metodo_pago === 'Efectivo' && venta.cambio > 0 && (
                      <span className="venta-cambio">Cambio: ${venta.cambio}</span>
                    )}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); eliminarVenta(venta.id); }} 
                    className="btn-eliminar-venta"
                    disabled={eliminando === venta.id}
                  >
                    {eliminando === venta.id ? '⏳' : '🗑️'}
                  </button>
                </div>
                
                {ventaSeleccionada === venta.id && (
                  <div className="venta-detalles">
                    <h4>Productos vendidos:</h4>
                    {detallesVenta.map(d => (
                      <div key={d.id} className="detalle-item">
                        <span>{d.cantidad}x {d.productos?.nombre}</span>
                        <span>${(d.cantidad * d.precio_unitario).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
