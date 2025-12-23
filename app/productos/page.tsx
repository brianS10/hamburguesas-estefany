'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Producto, Categoria } from '@/types';
import { supabase } from '@/lib/supabase';

export default function PaginaProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoriaId, setCategoriaId] = useState<number>(1);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [precioEdit, setPrecioEdit] = useState('');
  const [categoriaEdit, setCategoriaEdit] = useState<number>(1);
  const [eliminando, setEliminando] = useState<number | null>(null);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    const { data: cats } = await supabase.from('categorias').select('*').order('id');
    const { data: prods } = await supabase.from('productos').select('*, categorias(nombre)').order('categoria_id, nombre');
    setCategorias(cats || []);
    setProductos(prods || []);
    if (cats && cats.length > 0) setCategoriaId(cats[0].id);
    setCargando(false);
  };

  const agregarProducto = async () => {
    if (!nombre.trim() || !precio) {
      alert('⚠️ Completa todos los campos');
      return;
    }
    setGuardando(true);
    const { error } = await supabase.from('productos').insert({
      nombre: nombre.trim(),
      precio: parseFloat(precio),
      categoria_id: categoriaId
    });
    if (error) alert('❌ Error: ' + error.message);
    else {
      setNombre('');
      setPrecio('');
      cargarDatos();
    }
    setGuardando(false);
  };

  const iniciarEdicion = (prod: Producto) => {
    setEditandoId(prod.id);
    setNombreEdit(prod.nombre);
    setPrecioEdit(prod.precio.toString());
    setCategoriaEdit(prod.categoria_id);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setNombreEdit('');
    setPrecioEdit('');
  };

  const guardarEdicion = async () => {
    if (!nombreEdit.trim() || !precioEdit || !editandoId) {
      alert('⚠️ Completa todos los campos');
      return;
    }

    const nuevoPrecio = parseFloat(precioEdit);
    if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
      alert('⚠️ Precio inválido');
      return;
    }

    setGuardando(true);
    const { error } = await supabase
      .from('productos')
      .update({ 
        nombre: nombreEdit.trim(), 
        precio: nuevoPrecio,
        categoria_id: categoriaEdit
      })
      .eq('id', editandoId);

    if (error) {
      alert('❌ Error: ' + error.message);
    } else {
      cancelarEdicion();
      cargarDatos();
    }
    setGuardando(false);
  };

  const eliminarProducto = async (id: number, nombreProd: string) => {
    if (!confirm(`¿Eliminar "${nombreProd}"?\n\nEsta acción no se puede deshacer.`)) return;
    
    setEliminando(id);
    
    try {
      // Primero eliminar los detalles de venta relacionados
      const { error: errorDetalles } = await supabase
        .from('detalle_ventas')
        .delete()
        .eq('producto_id', id);
      
      if (errorDetalles) {
        console.error('Error eliminando detalles:', errorDetalles);
        // Continuar de todos modos
      }

      // Ahora eliminar el producto
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) {
        alert('❌ Error al eliminar: ' + error.message);
      } else {
        cargarDatos();
      }
    } catch (err) {
      console.error('Error:', err);
      alert('❌ Error al eliminar el producto');
    } finally {
      setEliminando(null);
    }
  };

  const obtenerEmoji = (nombre: string) => {
    const emojis: Record<string, string> = {
      'Hamburguesas': '🍔', 'Alitas': '🍗', 'Tacos': '🌮', 'Bebidas': '🥤', 'Extras': '🍟'
    };
    return emojis[nombre] || '🍽️';
  };

  if (cargando) return (
    <main className="prod-page"><div className="pantalla-carga"><div className="spinner"></div><p>Cargando...</p></div></main>
  );

  return (
    <main className="prod-page">
      {/* Header */}
      <header className="prod-header">
        <a href="/" className="prod-back">←</a>
        <div className="prod-title">
          <Image src="/logo_estefany.jpg" alt="Logo" width={40} height={40} className="prod-logo" />
          <h1>Productos</h1>
        </div>
        <span className="prod-count">{productos.length}</span>
      </header>

      {/* Formulario agregar */}
      <section className="prod-form">
        <h2>➕ Nuevo Producto</h2>
        
        <div className="prod-form-grid">
          <div className="prod-field">
            <label>Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Hamburguesa Especial"
            />
          </div>
          
          <div className="prod-field">
            <label>Precio</label>
            <input
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="0"
            />
          </div>
          
          <div className="prod-field">
            <label>Categoría</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(Number(e.target.value))}>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{obtenerEmoji(cat.nombre)} {cat.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={agregarProducto} disabled={guardando} className="prod-btn-add">
          {guardando ? '⏳ Guardando...' : '✓ Agregar Producto'}
        </button>
      </section>

      {/* Lista de productos */}
      <section className="prod-list">
        <h2>📋 Tus Productos</h2>
        
        {productos.length === 0 ? (
          <div className="prod-empty">
            <span>📦</span>
            <p>No hay productos</p>
            <small>Agrega tu primer producto arriba</small>
          </div>
        ) : (
          <div className="prod-grid">
            {productos.map(prod => (
              <div key={prod.id} className={`prod-card ${editandoId === prod.id ? 'editando' : ''}`}>
                {editandoId === prod.id ? (
                  // Modo edición
                  <div className="prod-card-edit">
                    <div className="prod-edit-fields">
                      <input
                        type="text"
                        value={nombreEdit}
                        onChange={(e) => setNombreEdit(e.target.value)}
                        placeholder="Nombre"
                        className="prod-edit-input"
                        autoFocus
                      />
                      <div className="prod-edit-row">
                        <input
                          type="number"
                          value={precioEdit}
                          onChange={(e) => setPrecioEdit(e.target.value)}
                          placeholder="Precio"
                          className="prod-edit-input precio"
                        />
                        <select 
                          value={categoriaEdit} 
                          onChange={(e) => setCategoriaEdit(Number(e.target.value))}
                          className="prod-edit-select"
                        >
                          {categorias.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="prod-edit-actions">
                      <button onClick={guardarEdicion} className="prod-btn_save" disabled={guardando}>
                        {guardando ? '⏳' : '✓ Guardar'}
                      </button>
                      <button onClick={cancelarEdicion} className="prod-btn-cancel">
                        ✕ Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  // Modo visualización
                  <>
                    <div className="prod-card-info">
                      <span className="prod-card-emoji">{obtenerEmoji(prod.categorias?.nombre || '')}</span>
                      <div className="prod-card-data">
                        <span className="prod-card-name">{prod.nombre}</span>
                        <span className="prod-card-cat">{prod.categorias?.nombre || 'Sin categoría'}</span>
                      </div>
                      <span className="prod-card-price">${prod.precio}</span>
                    </div>
                    <div className="prod-card-actions">
                      <button onClick={() => iniciarEdicion(prod)} className="prod-btn-edit">
                        ✏️ Editar
                      </button>
                      <button 
                        onClick={() => eliminarProducto(prod.id, prod.nombre)} 
                        className="prod-btn-del"
                        disabled={eliminando === prod.id}
                      >
                        {eliminando === prod.id ? '⏳' : '🗑️ Eliminar'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
