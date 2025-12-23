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
  const [editando, setEditando] = useState<number | null>(null);
  const [precioEditando, setPrecioEditando] = useState('');

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
    setEditando(prod.id);
    setPrecioEditando(prod.precio.toString());
  };

  const guardarPrecio = async (id: number) => {
    const nuevoPrecio = parseFloat(precioEditando);
    if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
      alert('⚠️ Precio inválido');
      return;
    }
    const { error } = await supabase.from('productos').update({ precio: nuevoPrecio }).eq('id', id);
    if (error) alert('❌ Error: ' + error.message);
    else {
      setEditando(null);
      cargarDatos();
    }
  };

  const eliminarProducto = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    await supabase.from('productos').delete().eq('id', id);
    cargarDatos();
  };

  if (cargando) return (
    <main className="pagina"><div className="pantalla-carga"><div className="spinner"></div><p>Cargando...</p></div></main>
  );

  return (
    <main className="pagina">
      <header className="pagina-header">
        <Image src="/logo_estefany.jpg" alt="Logo" width={80} height={80} className="logo" />
        <h1>📦 Productos</h1>
        <a href="/" className="btn-volver">← Volver</a>
      </header>

      <section className="formulario-card">
        <h2>➕ Agregar Producto</h2>
        <div className="formulario-grid">
          <div className="campo">
            <label>Nombre</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Hamburguesa Especial" />
          </div>
          <div className="campo">
            <label>Precio</label>
            <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0" />
          </div>
          <div className="campo">
            <label>Categoría</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(Number(e.target.value))}>
              {categorias.map(cat => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))}
            </select>
          </div>
          <button onClick={agregarProducto} disabled={guardando} className="btn-agregar">
            {guardando ? '⏳' : '✓ Agregar'}
          </button>
        </div>
      </section>

      <section className="lista-card">
        <h2>📋 Productos ({productos.length})</h2>
        {productos.length === 0 ? (
          <div className="estado-vacio"><span className="emoji-grande">📦</span><h3>No hay productos</h3></div>
        ) : (
          <div className="tabla-productos-admin">
            {productos.map(prod => (
              <div key={prod.id} className="producto-fila">
                <span className="producto-fila-nombre">{prod.nombre}</span>
                <span className="producto-fila-categoria">{prod.categorias?.nombre}</span>
                {editando === prod.id ? (
                  <div className="editar-precio">
                    <input
                      type="number"
                      value={precioEditando}
                      onChange={(e) => setPrecioEditando(e.target.value)}
                      className="input-precio-edit"
                      autoFocus
                    />
                    <button onClick={() => guardarPrecio(prod.id)} className="btn-guardar-precio">✓</button>
                    <button onClick={() => setEditando(null)} className="btn-cancelar-precio">✕</button>
                  </div>
                ) : (
                  <span className="producto-fila-precio" onClick={() => iniciarEdicion(prod)}>
                    ${prod.precio} ✏️
                  </span>
                )}
                <button onClick={() => eliminarProducto(prod.id, prod.nombre)} className="btn-eliminar-prod">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
