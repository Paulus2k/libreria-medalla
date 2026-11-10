import React, { useEffect, useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, X, Phone, Mail, MapPin, CreditCard, CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react'
import { proveedoresAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

import {sincronizarPago} from '../lib/calendar.mjs'

function fmt(n) {
  return Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })
}

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-GT', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function diasRestantes(fechaPago) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fecha = new Date(fechaPago + 'T00:00:00')
  return Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24))
}

function colorDias(dias) {
  if (dias < 0) return 'var(--red-anular)'
  if (dias <= 3) return 'var(--red-anular)'
  if (dias <= 7) return 'var(--gold)'
  return 'var(--sage)'
}

function labelDias(dias) {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`
  if (dias === 0) return 'Vence hoy'
  if (dias === 1) return 'Vence mañana'
  return `${dias} días restantes`
}

const VACIO_PROV = { nombre: '', correo: '', telefono: '', locacion: '' }
const VACIO_PAGO = { monto: '', fecha_pago: '', notas: '' }

export default function Proveedores() {
  const { addToast } = useToast()
  const [proveedores, setProveedores]           = useState([])
  const [verArchivados,setVerArchivados]=useState(false)
  const [pagoPorLiquidar,setPagoPorLiquidar]=useState(null)
  const [todosPagos, setTodosPagos]             = useState([])
  const [loading, setLoading]                   = useState(true)
  const [tab, setTab]                           = useState('proveedores')
  const [modalProv, setModalProv]               = useState(false)
  const [editandoPago,setEditandoPago]=useState(null)
  const [modalPago, setModalPago]               = useState(false)
  const [editandoProv, setEditandoProv]         = useState(null)
  const [provSeleccionado, setProvSeleccionado] = useState(null)
  const [formProv, setFormProv]                 = useState(VACIO_PROV)
  const [formPago, setFormPago]                 = useState(VACIO_PAGO)
  const [guardando, setGuardando]               = useState(false)
  const [confirmDelete, setConfirmDelete]       = useState(null)
  const [agregandoCal, setAgregandoCal]   = useState(null)
  const [modalCal, setModalCal]           = useState(null)
  const [calHora, setCalHora]             = useState('08:00')
  const [calRepetir, setCalRepetir]       = useState(false)
  const [calCadaHoras, setCalCadaHoras]   = useState(3)
  const [calHoraFin, setCalHoraFin]       = useState('20:00')

  async function cargar() {
    setLoading(true)
    try {
      const [p, pg] = await Promise.all([proveedoresAPI.getAll(verArchivados), proveedoresAPI.getTodosPagos()])
      setProveedores(Array.isArray(p) ? p : (p.data || []))
      setTodosPagos(Array.isArray(pg) ? pg : (pg.data || []))
    } catch (err) {
      addToast('Error al cargar: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [verArchivados])

  const pagosAlerta = useMemo(() =>
    todosPagos.filter(p => p.estado === 'pendiente' && diasRestantes(p.fecha_pago) <= 7)
      .sort((a, b) => new Date(a.fecha_pago) - new Date(b.fecha_pago)),
    [todosPagos]
  )

  const pagosPendientes = useMemo(() =>
    todosPagos.filter(p => p.estado === 'pendiente')
      .sort((a, b) => new Date(a.fecha_pago) - new Date(b.fecha_pago)),
    [todosPagos]
  )

  const pagosPagados = useMemo(() =>
    todosPagos.filter(p => p.estado === 'pagado')
      .sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago)),
    [todosPagos]
  )

  function abrirNuevoProv() { setEditandoProv(null); setFormProv(VACIO_PROV); setModalProv(true) }

  function abrirEditarProv(p) {
    setEditandoProv(p)
    setFormProv({ nombre: p.nombre || '', correo: p.correo || '', telefono: p.telefono || '', locacion: p.locacion || '' })
    setModalProv(true)
  }

  async function handleGuardarProv(e) {
    e.preventDefault()
    if (!formProv.nombre) { addToast('El nombre es obligatorio', 'error'); return }
    setGuardando(true)
    try {
      if (editandoProv) {
        await proveedoresAPI.update(editandoProv.id, formProv)
        addToast('Proveedor actualizado', 'success')
      } else {
        await proveedoresAPI.create(formProv)
        addToast('Proveedor creado', 'success')
      }
      setModalProv(false)
      cargar()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminarProv(id) {
    try {
      await proveedoresAPI.delete(id)
      addToast('Proveedor archivado', 'success')
      setConfirmDelete(null)
      cargar()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    }
  }

  function abrirNuevoPago(proveedor) {
    setEditandoPago(null)
    setProvSeleccionado(proveedor)
    setFormPago(VACIO_PAGO)
    setModalPago(true)
  }

  async function handleGuardarPago(e) {
    e.preventDefault()
    if (!formPago.monto || !formPago.fecha_pago) { addToast('Monto y fecha son obligatorios', 'error'); return }
    setGuardando(true)
    try {
      if(editandoPago) await proveedoresAPI.updatePago(editandoPago.id, editandoPago.estado==='pagado'?{notas:formPago.notas}:formPago)
      else await proveedoresAPI.createPago(provSeleccionado.id, formPago)
      addToast('Pago registrado', 'success')
      setModalPago(false)
      cargar()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function handleMarcarPagado(pagoId) {
    try {
      await proveedoresAPI.marcarPagado(pagoId,{cuenta:pagoPorLiquidar.cuenta,contrapartida:pagoPorLiquidar.contrapartida})
      setPagoPorLiquidar(null)
      addToast('Pago marcado como pagado', 'success')
      cargar()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    }
  }

  async function handleEliminarPago(pagoId) {
    try {
      await proveedoresAPI.deletePago(pagoId)
      addToast('Pago eliminado', 'success')
      cargar()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    }
  }

  async function handleAgregarCalendario(pago) {
    setAgregandoCal(pago.id)
    try {
      const eventos=await sincronizarPago({
        id:pago.id,eventos:pago.calendario_eventos||[],
        proveedor:  pago.proveedores?.nombre || 'Proveedor',
        monto:      pago.monto,
        fecha_pago: pago.fecha_pago,
        notas:      pago.notas,
        hora:       calHora,
        repetir:    calRepetir,
        cadaHoras:  calCadaHoras,
        horaFin:    calHoraFin,
      })
      await proveedoresAPI.updatePago(pago.id,{calendario_eventos:eventos})
      addToast('Recordatorios actualizados en Google Calendar', 'success')
      await cargar()
      return true
    } catch (err) {
      console.error(err)
      addToast('Error al agregar al calendario: ' + (err.message || 'Intenta de nuevo'), 'error')
    } finally {
      setAgregandoCal(null)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Módulo de <span>Proveedores</span></h2>
          <p className="page-subtitle">{proveedores.length} proveedores · {pagosPendientes.length} pagos pendientes</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${tab === 'proveedores' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('proveedores')}>
            Proveedores
          </button>
          <button className={`btn ${tab === 'pagos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('pagos')}>
            Pagos {pagosPendientes.length > 0 && <span className="badge badge-red" style={{ marginLeft: 6 }}>{pagosPendientes.length}</span>}
          </button>
        </div>
      </div>

      <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:18}}><input type="checkbox" checked={verArchivados} onChange={e=>setVerArchivados(e.target.checked)}/> Mostrar proveedores archivados</label>
      {pagosAlerta.length > 0 && (
        <div style={{
          marginBottom: 20, padding: '14px 18px', background: 'var(--red-pale)',
          borderRadius: 'var(--radius)', border: '1px solid rgba(192,57,43,0.2)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--red-anular)' }}>
            <AlertCircle size={16} />
            {pagosAlerta.length} pago{pagosAlerta.length !== 1 ? 's' : ''} próximo{pagosAlerta.length !== 1 ? 's' : ''} a vencer
          </div>
          {pagosAlerta.map(p => {
            const dias = diasRestantes(p.fecha_pago)
            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <span><strong>{p.proveedores?.nombre}</strong> — Q {fmt(p.monto)}</span>
                <span style={{ color: colorDias(dias), fontWeight: 700 }}>{labelDias(dias)}</span>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'proveedores' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={abrirNuevoProv}>
              <Plus size={16} /> Nuevo proveedor
            </button>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" style={{ width: 28, height: 28 }} /><span>Cargando…</span></div>
          ) : proveedores.length === 0 ? (
            <div className="empty-state"><CreditCard size={48} /><p>No hay proveedores registrados</p></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {proveedores.map(p => {
                const pagsProv = todosPagos.filter(pg => pg.proveedor_id === p.id && pg.estado === 'pendiente')
                const totalPendiente = pagsProv.reduce((s, pg) => s + parseFloat(pg.monto || 0), 0)
                return (
                  <div key={p.id} className="card">
                    <div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700 }}>{p.nombre}</h3>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => abrirEditarProv(p)}><Edit2 size={14} /></button>
                          {p.activo===false?<button className="btn btn-secondary btn-sm" onClick={async()=>{try{await proveedoresAPI.restaurar(p.id);await cargar()}catch(e){addToast(e.message,'error')}}}>Restaurar</button>:<button className="btn btn-danger btn-icon btn-sm" title="Archivar proveedor" onClick={() => setConfirmDelete(p)}><Trash2 size={14} /></button>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                        {p.correo && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', opacity: 0.7 }}><Mail size={13} /> {p.correo}</div>}
                        {p.telefono && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', opacity: 0.7 }}><Phone size={13} /> {p.telefono}</div>}
                        {p.locacion && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', opacity: 0.7 }}><MapPin size={13} /> {p.locacion}</div>}
                      </div>
                      {totalPendiente > 0 && (
                        <div style={{ padding: '8px 12px', background: 'var(--red-pale)', borderRadius: 'var(--radius)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--red-anular)' }}>Pendiente por pagar</span>
                          <span style={{ fontWeight: 700, color: 'var(--red-anular)' }}>Q {fmt(totalPendiente)}</span>
                        </div>
                      )}
                      <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.83rem' }} onClick={() => abrirNuevoPago(p)}>
                        <Plus size={13} /> Registrar pago
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'pagos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Pagos pendientes</h3>
              <span className="badge badge-gold">{pagosPendientes.length}</span>
            </div>
            <div className="card-body" style={{ paddingTop: 8 }}>
              {pagosPendientes.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.875rem', padding: '20px 0' }}>Sin pagos pendientes</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Proveedor</th>
                        <th className="text-right">Monto</th>
                        <th>Fecha de pago</th>
                        <th>Estado</th>
                        <th>Notas</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagosPendientes.map(p => {
                        const dias = diasRestantes(p.fecha_pago)
                        return (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 700 }}>{p.proveedores?.nombre || '—'}</td>
                            <td className="text-right" style={{ fontWeight: 700 }}>Q {fmt(p.monto)}</td>
                            <td>{fmtFecha(p.fecha_pago)}</td>
                            <td><span style={{ fontSize: '0.8rem', fontWeight: 700, color: colorDias(dias) }}>{labelDias(dias)}</span></td>
                            <td style={{ fontSize: '0.82rem', opacity: 0.6 }}>{p.notas || '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="btn btn-secondary btn-sm" onClick={()=>{setEditandoPago(p);setProvSeleccionado({id:p.proveedor_id,nombre:p.proveedores?.nombre});setFormPago({monto:p.monto,fecha_pago:p.fecha_pago,notas:p.notas||''});setModalPago(true)}}><Edit2 size={13}/>Editar</button><button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => { setModalCal(p); setCalHora('08:00'); setCalRepetir(false); setCalCadaHoras(3); setCalHoraFin('20:00') }}
                                  title="Agregar a Google Calendar"
                                >
                                  <Calendar size={13} /> Calendario
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setPagoPorLiquidar({...p,cuenta:'',contrapartida:''})}>
                                  <CheckCircle size={13} /> Pagado
                                </button>
                                <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleEliminarPago(p.id)}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {pagosPagados.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Pagos realizados</h3>
                <span className="badge badge-green">{pagosPagados.length}</span>
              </div>
              <div className="card-body" style={{ paddingTop: 8 }}>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Proveedor</th>
                        <th className="text-right">Monto</th>
                        <th>Fecha</th>
                        <th>Notas</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagosPagados.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 700 }}>{p.proveedores?.nombre || '—'}</td>
                          <td className="text-right" style={{ fontWeight: 700 }}>Q {fmt(p.monto)}</td>
                          <td>{fmtFecha(p.fecha_pago)}</td>
                          <td style={{ fontSize: '0.82rem', opacity: 0.6 }}>{p.notas || '—'}</td>
                          <td>
                            <button className="btn btn-secondary btn-sm" onClick={()=>{setEditandoPago(p);setProvSeleccionado({id:p.proveedor_id,nombre:p.proveedores?.nombre});setFormPago({monto:p.monto,fecha_pago:p.fecha_pago,notas:p.notas||''});setModalPago(true)}}><Edit2 size={13}/>Editar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {confirmDelete&&<div className="modal-overlay"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="archivar-proveedor"><div className="modal-body"><h2 id="archivar-proveedor">Archivar proveedor</h2><p>¿Archivar a {confirmDelete.nombre}? Dejará de aparecer en proveedores activos; sus pagos realizados se conservarán. Si tiene pagos pendientes, primero debes resolverlos.</p></div><div className="modal-footer"><button autoFocus className="btn btn-secondary" onClick={()=>setConfirmDelete(null)}>Cancelar</button><button className="btn btn-danger" onClick={()=>handleEliminarProv(confirmDelete.id)}>Archivar proveedor</button></div></section></div>}
      {pagoPorLiquidar&&<div className="modal-overlay"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="liquidar-pago"><form onSubmit={e=>{e.preventDefault();handleMarcarPagado(pagoPorLiquidar.id)}}><div className="modal-body"><h2 id="liquidar-pago">Registrar pago realizado</h2><p>Q {fmt(pagoPorLiquidar.monto)} a {pagoPorLiquidar.proveedores?.nombre}. Después de la apertura contable se genera el asiento automáticamente.</p><label>Cuenta de salida<select required className="form-select" value={pagoPorLiquidar.cuenta} onChange={e=>setPagoPorLiquidar({...pagoPorLiquidar,cuenta:e.target.value})}><option value="">Selecciona</option><option value="caja">Caja</option><option value="bancos">Bancos</option></select></label><label>Concepto contable<select required className="form-select" value={pagoPorLiquidar.contrapartida} onChange={e=>setPagoPorLiquidar({...pagoPorLiquidar,contrapartida:e.target.value})}><option value="">Selecciona</option><option value="proveedores">Pago de deuda ya registrada a proveedores</option><option value="gastos">Gasto que todavía no se ha registrado</option><option value="inventario">Compra de inventario que todavía no se ha registrado</option></select></label></div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={()=>setPagoPorLiquidar(null)}>Cancelar</button><button className="btn btn-primary">Confirmar pago</button></div></form></section></div>}
      {/* Modal proveedor */}
      {modalProv && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalProv(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editandoProv ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalProv(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleGuardarProv}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input className="form-input" placeholder="Nombre del proveedor" value={formProv.nombre}
                    onChange={e => setFormProv(p => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Correo</label>
                    <input className="form-input" type="email" placeholder="correo@ejemplo.com" value={formProv.correo}
                      onChange={e => setFormProv(p => ({ ...p, correo: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input className="form-input" placeholder="5555-0000" value={formProv.telefono}
                      onChange={e => setFormProv(p => ({ ...p, telefono: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Locación / Dirección</label>
                  <input className="form-input" placeholder="Ciudad, país o dirección" value={formProv.locacion}
                    onChange={e => setFormProv(p => ({ ...p, locacion: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalProv(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Guardando…</> : editandoProv ? 'Guardar cambios' : 'Crear proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pago */}
      {modalPago && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalPago(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editandoPago ? "Editar pago" : "Registrar pago"} — {provSeleccionado?.nombre}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalPago(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleGuardarPago}>
              <div className="modal-body">
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Monto a pagar (Q) *</label>
                    <input className="form-input" disabled={editandoPago?.estado==='pagado'} type="number" step="0.01" min="0.01" placeholder="0.00"
                      value={formPago.monto} onChange={e => setFormPago(p => ({ ...p, monto: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de pago *</label>
                    <input className="form-input" type="date" disabled={editandoPago?.estado==='pagado'} value={formPago.fecha_pago}
                      onChange={e => setFormPago(p => ({ ...p, fecha_pago: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <input className="form-input" placeholder="Ej: Factura #001, pedido de libros…"
                    value={formPago.notas} onChange={e => setFormPago(p => ({ ...p, notas: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalPago(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Guardando…</> : editandoPago ? 'Guardar cambios' : 'Registrar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Google Calendar */}
      {modalCal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalCal(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title"><Calendar size={16} style={{ marginRight: 8 }} />Agregar a Google Calendar</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalCal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: 16 }}>
                Pago de <strong>Q {fmt(modalCal.monto)}</strong> a <strong>{modalCal.proveedores?.nombre}</strong> el {fmtFecha(modalCal.fecha_pago)}
              </p>
              <div className="form-group">
                <label className="form-label">Hora de notificación *</label>
                <input className="form-input" type="time" value={calHora} onChange={e => setCalHora(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={calRepetir} onChange={e => setCalRepetir(e.target.checked)} style={{ width: 16, height: 16 }} />
                  Repetir notificación cada X horas (opcional)
                </label>
              </div>
              {calRepetir && (
                <div className="form-row form-row-2" style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Cada cuántas horas</label>
                    <input className="form-input" type="number" min="1" max="12" value={calCadaHoras}
                      onChange={e => setCalCadaHoras(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hasta qué hora</label>
                    <input className="form-input" type="time" value={calHoraFin} onChange={e => setCalHoraFin(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalCal(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={agregandoCal === modalCal.id}
                onClick={async () => { if(await handleAgregarCalendario(modalCal)) setModalCal(null) }}>
                {agregandoCal === modalCal.id
                  ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Agregando…</>
                  : <><Calendar size={14} /> Agregar al calendario</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

