'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface Categoria {
  id: number;
  nombre: string;
}

const EMOJIS_DISPONIBLES = [
  { emoji: '🍔', nombre: 'Hamburguesa' },
  { emoji: '🍗', nombre: 'Pollo/Alitas' },
  { emoji: '🌮', nombre: 'Tacos' },
  { emoji: '🌯', nombre: 'Burritos' },
  { emoji: '🥤', nombre: 'Bebidas' },
  { emoji: '🍟', nombre: 'Papas/Extras' },
  { emoji: '🍕', nombre: 'Pizza' },
  { emoji: '🌭', nombre: 'Hot Dog' },
  { emoji: '🥗', nombre: 'Ensaladas' },
  { emoji: '🍰', nombre: 'Postres' },
  { emoji: '🍦', nombre: 'Helados' },
  { emoji: '☕', nombre: 'Café' },
  { emoji: '🧃', nombre: 'Jugos' },
  { emoji: '🥪', nombre: 'Sandwiches' },
  { emoji: '🍱', nombre: 'Combos' },
  { emoji: '🍳', nombre: 'Desayunos' },
  { emoji: '🥓', nombre: 'Tocino' },
  { emoji: '🧀', nombre: 'Quesos' },
  { emoji: '🍽️', nombre: 'Otros' },
];

export default function PaginaCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nombre, setNombre] = useState('');
  const [emojiSeleccionado, setEmojiSeleccionado] = useState('🍽️');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEditando, setNombreEditando] = useState('');

  useEffect(() => { cargarCategorias(); }, []);

  const cargarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').order('id');
    setCategorias(data || []);
    setCargando(false);
  };

  const agregarCategoria = async () => {
    if (!nombre.trim()) {
      alert('⚠️ Escribe un nombre');
      return;
    }
    setGuardando(true);
    const { error } = await supabase.from('categorias').insert({ nombre: nombre.trim() });
    if (error) alert('❌ Error: ' + error.message);
    else {
      setNombre('');
      setEmojiSeleccionado('🍽️');
      cargarCategorias();
    }
    setGuardando(false);
  };

  const iniciarEdicion = (cat: Categoria) => {
    setEditandoId(cat.id);
    setNombreEditando(cat.nombre);
  };

  const guardarEdicion = async () => {
    if (!nombreEditando.trim() || !editandoId) return;
    const { error } = await supabase.from('categorias').update({ nombre: nombreEditando.trim() }).eq('id', editandoId);
    if (error) alert('❌ Error: ' + error.message);
    else {
      setEditandoId(null);
      setNombreEditando('');
      cargarCategorias();
    }
  };

  const eliminarCategoria = async (id: number, nombreCat: string) => {
    const { data: productos } = await supabase.from('productos').select('id').eq('categoria_id', id);
    
    if (productos && productos.length > 0) {
      alert(`⚠️ No puedes eliminar "${nombreCat}" porque tiene ${productos.length} producto(s).\n\nElimina los productos primero.`);
      return;
    }
    
    if (!confirm(`¿Eliminar categoría "${nombreCat}"?`)) return;
    
    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) alert('❌ Error: ' + error.message);
    else cargarCategorias();
  };

  const obtenerEmoji = (nombre: string) => {
    const emojis: Record<string, string> = {
      'Hamburguesas': '🍔', 'Alitas': '🍗', 'Tacos': '🌮', 'Bebidas': '🥤', 'Extras': '🍟',
      'Postres': '🍰', 'Ensaladas': '🥗', 'Combos': '🍱', 'Desayunos': '🍳', 'Pizza': '🍕',
      'Hot Dogs': '🌭', 'Burritos': '🌯', 'Café': '☕', 'Jugos': '🧃'
    };
    return emojis[nombre] || '🍽️';
  };

  if (cargando) return (
    <main className="cat-page"><div className="pantalla-carga"><div className="spinner"></div><p>Cargando...</p></div></main>
  );

  return (
    <main className="cat-page">
      {/* Header */}
      <header className="cat-header">
        <a href="/" className="cat-back">←</a>
        <div className="cat-title">
          <Image src="/logo_estefany.jpg" alt="Logo" width={40} height={40} className="cat-logo" />
          <h1>Categorías</h1>
        </div>
        <span className="cat-count">{categorias.length}</span>
      </header>

      {/* Formulario agregar */}
      <section className="cat-form">
        <h2>➕ Nueva Categoría</h2>
        
        <div className="cat-form-row">
          <div className="emoji-selector">
            <span className="emoji-preview">{emojiSeleccionado}</span>
          </div>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de categoría"
            className="cat-input"
            onKeyDown={(e) => e.key === 'Enter' && agregarCategoria()}
          />
          <button onClick={agregarCategoria} disabled={guardando} className="cat-btn-add">
            {guardando ? '⏳' : '✓'}
          </button>
        </div>

        <div className="emoji-list">
          {EMOJIS_DISPONIBLES.map(({ emoji, nombre }) => (
            <button
              key={emoji}
              type="button"
              className={`emoji-opt ${emojiSeleccionado === emoji ? 'selected' : ''}`}
              onClick={() => setEmojiSeleccionado(emoji)}
              title={nombre}
            >
              {emoji}
            </button>
          ))}
        </div>
      </section>

      {/* Lista de categorías */}
      <section className="cat-list">
        <h2>📋 Tus Categorías</h2>
        
        {categorias.length === 0 ? (
          <div className="cat-empty">
            <span>🏷️</span>
            <p>No hay categorías</p>
            <small>Agrega tu primera categoría arriba</small>
          </div>
        ) : (
          <div className="cat-grid">
            {categorias.map(cat => (
              <div key={cat.id} className="cat-card">
                <span className="cat-card-emoji">{obtenerEmoji(cat.nombre)}</span>
                
                {editandoId === cat.id ? (
                  <div className="cat-card-edit">
                    <input
                      type="text"
                      value={nombreEditando}
                      onChange={(e) => setNombreEditando(e.target.value)}
                      className="cat-edit-input"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') guardarEdicion();
                        if (e.key === 'Escape') setEditandoId(null);
                      }}
                    />
                    <div className="cat-edit-btns">
                      <button onClick={guardarEdicion} className="cat-btn-save">✓</button>
                      <button onClick={() => setEditandoId(null)} className="cat-btn-cancel">✕</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="cat-card-info">
                      <span className="cat-card-name">{cat.nombre}</span>
                      <span className="cat-card-id">ID: {cat.id}</span>
                    </div>
                    <div className="cat-card-actions">
                      <button onClick={() => iniciarEdicion(cat)} className="cat-btn-edit">✏️</button>
                      <button onClick={() => eliminarCategoria(cat.id, cat.nombre)} className="cat-btn-del">🗑️</button>
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
