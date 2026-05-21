import React, { useEffect, useState, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, Package, X, Tag } from 'lucide-react'
import { productosAPI, categoriasAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

const VACIO = {
  nombre: '', descripcion: '', precio: '', stock: '',
  stock_minimo: '5', categoria: '', codigo: '',
}

function fmt(n) {
  return Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })
}

export default function Productos() {
  const { addToast } = useToast()
  const [productos, setProductos]       = useState([])
  const [categorias, setCategorias]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [busqueda, setBusqueda]         = useState('')
  const [modalOpen, setModalOpen]       = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editando, setEditando]         = useState(null)
  const [form, setForm]                 = useState(VACIO)
  const [guardando, setGuardando]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [nuevaCat, setNuevaCat]         = useState('')
  const [guardandoCat, setGuardandoCat] = useState(false)
  const [nuevaCatInline, setNuevaCatInline] = useState('')
  const [mostrarInline, setMostrarInline]   = useState(false)
  const [guardandoInline, setGuardandoInline] = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([productosAPI.getAll(), categoriasAPI.getAll()])
      setProductos(Array.isArray(p) ? p : (p.data || []))
      setCategorias(Array.isArray(c) ? c : (c.data || []))
    } catch (err) {
      addToast('Error al cargar: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    if (!q) return productos
    return productos.filter(p =>
      p.nombre?.toLowerCase().includes(q) ||
      p.codigo?.toLowerCase().includes(q) ||
      p.categoria?.toLowerCase().includes(q)
    )
  }, [productos, busqueda])

  function abrirNuevo() {
    setEditando(null)
    setForm({ ...VACIO, categoria: categorias[0]?.nombre || '' })
    setModalOpen(true)
  }

  function abrirEditar(p) {
    setEditando(p)
    setForm({
      nombre:       p.nombre || '',
      descripcion:  p.descripcion || '',
      precio:       p.precio || '',
      stock:        p.stock || '',
      stock_minimo: p.stock_minimo ?? 5,
      categoria:    p.categoria || '',
      codigo:       p.codigo || '',
    })
    setModalOpen(true)
  }

  function cerrarModal() {
    setModalOpen(false)
    setEditando(null)
    setForm(VACIO)
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleGuardar(e) {
    e.preventDefault()
    if (!form.nombre || !form.precio || form.stock === '' || !form.categoria) {
      addToast('Nombre, precio, stock y categoría son obligatorios.', 'error')
      return
    }
    setGuardando(true)
    try {
      const payload = {
        ...form,
        precio:       parseFloat(form.precio),
        stock:        parseInt(form.stock),
        stock_minimo: parseInt(form.stock_minimo) || 5,
      }
      if (editando) {
        await productosAPI.update(editando.id, payload)
        addToast('Producto actualizado correctamente', 'success')
      } else {
        await productosAPI.create(payload)
        addToast('Producto creado correctamente', 'success')
      }
      cerrarModal()
      cargar()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id) {
    try {
      await productosAPI.delete(id)
      addToast('Producto eliminado', 'success')
      setConfirmDelete(null)
      cargar()
    } catch (err) {
      addToast('Error al eliminar: ' + err.message, 'error')
    }
  }

  async function handleCrearCategoria(e) {
    e.preventDefault()
    if (!nuevaCat.trim()) return
    setGuardandoCat(true)
    try {
      await categoriasAPI.create(nuevaCat.trim())
      addToast('Categoría creada', 'success')
      setNuevaCat('')
      const c = await categoriasAPI.getAll()
      setCategorias(Array.isArray(c) ? c : (c.data || []))
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    } finally {
      setGuardandoCat(false)
    }
  }

  async function handleCrearCatInline() {
    if (!nuevaCatInline.trim()) return
    setGuardandoInline(true)
    try {
      await categoriasAPI.create(nuevaCatInline.trim())
      const c = await categoriasAPI.getAll()
      const lista = Array.isArray(c) ? c : (c.data || [])
      setCategorias(lista)
      setForm(prev => ({ ...prev, categoria: nuevaCatInline.trim() }))
      setNuevaCatInline('')
      setMostrarInline(false)
      addToast('Categoría creada', 'success')
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    } finally {
      setGuardandoInline(false)
    }
  }

  async function handleEliminarCategoria(cat) {
    try {
      await categoriasAPI.delete(cat.id)
      addToast('Categoría eliminada', 'success')
      const c = await categoriasAPI.getAll()
      setCategorias(Array.isArray(c) ? c : (c.data || []))
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  // Cuántos productos usa cada categoría
  const usoPorCat = useMemo(() => {
    const m = {}
    productos.forEach(p => { m[p.categoria] = (m[p.categoria] || 0) + 1 })
    return m
  }, [productos])

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Catálogo de <span>Productos</span></h2>
          <p className="page-subtitle">{productos.length} productos registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setCatModalOpen(true)}>
            <Tag size={15} /> Categorías
          </button>
          <button className="btn btn-primary" onClick={abrirNuevo}>
            <Plus size={16} /> Nuevo producto
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '16px 20px' }}>
          <div className="search-bar">
            <div className="search-input-wrap">
              <Search size={16} />
              <input
                className="form-input"
                placeholder="Buscar por nombre, código o categoría…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
            {busqueda && (
              <button className="btn btn-ghost btn-sm" onClick={() => setBusqueda('')}>
                <X size={14} /> Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        {loading ? (
          <div className="loading-center">
            <div className="spinner" style={{ width: 28, height: 28 }} />
            <span>Cargando productos…</span>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="empty-state">
            <Package size={48} />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th className="text-right">Precio</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Stock mín.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id}>
                    <td>
                      <span className="font-mono" style={{ fontSize: '0.8rem', opacity: 0.55 }}>
                        {p.codigo || '—'}
                      </span>
                    </td>
                    <td>
                      <div className="td-nombre">{p.nombre}</div>
                      {p.descripcion && (
                        <div style={{ fontSize: '0.78rem', opacity: 0.5, marginTop: 2 }}>
                          {p.descripcion.length > 50 ? p.descripcion.slice(0, 50) + '…' : p.descripcion}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-gold">{p.categoria || '—'}</span>
                    </td>
                    <td className="text-right" style={{ fontWeight: 700 }}>
                      Q {fmt(p.precio)}
                    </td>
                    <td className="text-right">
                      <span className={`badge ${p.stock <= p.stock_minimo ? 'badge-red' : p.stock <= p.stock_minimo * 2 ? 'badge-gold' : 'badge-green'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="text-right" style={{ opacity: 0.6, fontSize: '0.85rem' }}>
                      {p.stock_minimo ?? 5}
                    </td>
                    <td className="text-right">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => abrirEditar(p)} title="Editar">
                          <Edit2 size={15} />
                        </button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => setConfirmDelete(p)} title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear/editar producto */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editando ? 'Editar producto' : 'Nuevo producto'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={cerrarModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleGuardar}>
              <div className="modal-body">
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input className="form-input" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Biblia Reina Valera" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Código / ISBN</label>
                    <input className="form-input" name="codigo" value={form.codigo} onChange={handleChange} placeholder="Ej: 978-000-001" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <input className="form-input" name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Descripción breve del producto" />
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Precio (Q) *</label>
                    <input className="form-input" name="precio" type="number" step="0.01" min="0" value={form.precio} onChange={handleChange} placeholder="0.00" />
                  </div>
                 <div className="form-group">
                    <label className="form-label">Categoría *</label>
                    <select className="form-select" name="categoria" value={form.categoria} onChange={handleChange}>
                      <option value="">— Selecciona —</option>
                      {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                    </select>
                    {!mostrarInline ? (
                      <button type="button" onClick={() => setMostrarInline(true)}
                        style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        + Nueva categoría
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <input
                          className="form-input"
                          placeholder="Nombre de categoría…"
                          value={nuevaCatInline}
                          onChange={e => setNuevaCatInline(e.target.value)}
                          style={{ flex: 1, fontSize: '0.85rem' }}
                          autoFocus
                        />
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleCrearCatInline} disabled={guardandoInline || !nuevaCatInline.trim()}>
                          {guardandoInline ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : 'Agregar'}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMostrarInline(false); setNuevaCatInline('') }}>
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Stock inicial *</label>
                    <input className="form-input" name="stock" type="number" min="0" value={form.stock} onChange={handleChange} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock mínimo</label>
                    <input className="form-input" name="stock_minimo" type="number" min="0" value={form.stock_minimo} onChange={handleChange} placeholder="5" />
                    <span style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: 4, display: 'block' }}>
                      Alerta cuando el stock baje de este número
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando
                    ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Guardando…</>
                    : editando ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal gestionar categorías */}
      {catModalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCatModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 className="modal-title">Gestionar categorías</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setCatModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {/* Crear nueva */}
              <form onSubmit={handleCrearCategoria} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <input
                  className="form-input"
                  placeholder="Nueva categoría…"
                  value={nuevaCat}
                  onChange={e => setNuevaCat(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" disabled={guardandoCat || !nuevaCat.trim()}>
                  {guardandoCat ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Plus size={15} />}
                  Agregar
                </button>
              </form>

              {/* Lista */}
              {categorias.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.45, fontSize: '0.875rem' }}>No hay categorías todavía</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {categorias.map(cat => {
                    const uso = usoPorCat[cat.nombre] || 0
                    return (
                      <div key={cat.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', background: 'var(--cream)', borderRadius: 'var(--radius)',
                        border: '1px solid var(--cream-dark)',
                      }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{cat.nombre}</span>
                          <span style={{ marginLeft: 10, fontSize: '0.78rem', opacity: 0.5 }}>
                            {uso} producto{uso !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <button
                          className="btn btn-danger btn-icon btn-sm"
                          onClick={() => handleEliminarCategoria(cat)}
                          disabled={uso > 0}
                          title={uso > 0 ? 'No se puede eliminar: tiene productos' : 'Eliminar'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCatModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">¿Eliminar producto?</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
                Esta acción no se puede deshacer. ¿Deseas eliminar <strong>"{confirmDelete.nombre}"</strong>?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleEliminar(confirmDelete.id)}>
                <Trash2 size={15} /> Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
