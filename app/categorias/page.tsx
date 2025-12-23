'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface Categoria {
  id: number;
  nombre: string;
  emoji?: string;
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
  { emoji: '🍺', nombre: 'Cerveza' },
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
  const [mostrarEmojis, setMostrarEmojis] = useState(false);

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
    
    // Guardamos el nombre con el emoji al inicio
    const nombreConEmoji = `${emojiSeleccionado} ${nombre.trim()}`;
    
    const { error } = await supabase.from('categorias').insert({ 
      nombre: nombre.trim()
    });
    
    if (error) alert('❌ Error: ' + error.message);
    else {
      setNombre('');
      setEmojiSeleccionado('🍽️');
      setMostrarEmojis(false);
      cargarCategorias();
    }
    setGuardando(false);
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
    <main className="pagina"><div className="pantalla-carga"><div className="spinner"></div><p>Cargando...</p></div></main>
  );

  return (
    <main className="pagina">
      <header className="pagina-header">
        <Image src="/logo_estefany.jpg" alt="Logo" width={70} height={70} className="logo" />
        <h1>🏷️ Categorías</h1>
        <a href="/" className="btn-volver">← Volver</a>
      </header>

      <section className="formulario-card">
        <h2>➕ Agregar Categoría</h2>
        
        <div className="selector-emoji-container">
          <div className="campo-con-emoji">
            <button 
              type="button"
              className="btn-emoji-selector"
              onClick={() => setMostrarEmojis(!mostrarEmojis)}
            >
              <span className="emoji-actual">{emojiSeleccionado}</span>
              <span className="emoji-label">Icono</span>
            </button>
            
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de la categoría"
              className="input-categoria"
            />
            
            <button onClick={agregarCategoria} disabled={guardando} className="btn-agregar">
              {guardando ? '⏳' : '✓ Agregar'}
            </button>
          </div>
          
          {mostrarEmojis && (
            <div className="emoji-picker">
              <p className="emoji-picker-titulo">Selecciona un icono:</p>
              <div className="emoji-grid">
                {EMOJIS_DISPONIBLES.map(({ emoji, nombre }) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`emoji-opcion ${emojiSeleccionado === emoji ? 'seleccionado' : ''}`}
                    onClick={() => { setEmojiSeleccionado(emoji); setMostrarEmojis(false); }}
                    title={nombre}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="lista-card">
        <h2>📋 Categorías ({categorias.length})</h2>
        {categorias.length === 0 ? (
          <div className="estado-vacio">
            <span className="emoji-grande">🏷️</span>
            <h3>No hay categorías</h3>
            <p>Agrega tu primera categoría arriba</p>
          </div>
        ) : (
          <div className="grid-categorias">
            {categorias.map(cat => (
              <div key={cat.id} className="categoria-card">
                <span className="categoria-emoji">{obtenerEmoji(cat.nombre)}</span>
                <span className="categoria-nombre">{cat.nombre}</span>
                <span className="categoria-id">ID: {cat.id}</span>
                <button onClick={() => eliminarCategoria(cat.id, cat.nombre)} className="btn-eliminar-cat">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
