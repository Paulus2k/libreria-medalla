import React, { useState } from 'react'
import { Upload, Download, CheckCircle, FileSpreadsheet } from 'lucide-react'
import { productosAPI, comercioAPI } from '../services/api'
import { parseCSV, validateRows, download, money } from '../lib/commerce.mjs'
export default function Importar() {
 const [rows,setRows]=useState([]), [file,setFile]=useState(''), [busy,setBusy]=useState(false), [error,setError]=useState(''), [success,setSuccess]=useState('')
 const invalid=rows.filter(r=>r.errores.length).length
 async function read(e) {
  const f=e.target.files?.[0]; if(!f)return
  setRows([]);setError('');setSuccess('');setFile(f.name);setBusy(true)
  try { if(f.size>2*1024*1024)throw new Error('El archivo supera los 2 MB.'); const [text,p]=await Promise.all([f.text(),productosAPI.getAll()]);setRows(validateRows(parseCSV(text),p.data||p)) }
  catch(e){setError(e.message)}finally{setBusy(false);e.target.value=''}
 }
 async function save(){setBusy(true);setError('');try{const r=await comercioAPI.importar({filas:rows.map(({fila,errores,...p})=>p),archivo:file});setSuccess(`${r.data.cantidad} productos registrados. El inventario ya está actualizado.`);setRows([])}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <div className="page-container"><div className="page-header"><div><h1 className="page-title">Ingreso <span>masivo</span></h1><p className="page-subtitle">De una hoja de cálculo a tu catálogo, sin registrar producto por producto.</p></div><button className="btn btn-secondary" onClick={()=>download('plantilla-productos.csv','codigo,nombre,categoria,precio,costo,stock,stock_minimo,descripcion\nLIB-001,Cuaderno universitario,Papelería,25.00,16.00,40,5,Cuaderno de líneas\n')}><Download size={17}/>Descargar plantilla</button></div>
 <div className="workflow-note"><FileSpreadsheet size={26}/><div><strong>Prepara, revisa y confirma</strong><p>Exporta Excel o Google Sheets como CSV UTF-8. Incluye código único, nombre, categoría, precio de venta, costo y cantidad. Hasta 1000 productos; máximo 2 MB.</p></div></div>
 <label className="import-zone"><Upload size={32}/><strong>{busy?'Procesando…':'Selecciona tu documento CSV'}</strong><span>Separado por comas o punto y coma · importación de productos nuevos</span><input aria-label="Seleccionar documento CSV" type="file" accept=".csv,text/csv" disabled={busy} onChange={read}/></label>
 {error&&<div role="alert" className="notice error">{error}</div>}{success&&<div role="status" className="notice success"><CheckCircle size={20}/>{success}</div>}
 {!!rows.length&&<section className="card"><div className="section-bar"><div><h2>Revisión del documento</h2><p>{file} · {rows.length} productos · {invalid} filas con errores</p></div><button className="btn btn-primary" disabled={busy||!!invalid} onClick={save}>{busy?'Guardando…':`Importar ${rows.length} productos`}</button></div><div className="table-wrapper"><table><thead><tr>{['Fila','Código','Producto','Categoría','Cantidad','Costo','Precio','Validación'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.fila}><td>{r.fila}</td><td>{r.codigo}</td><td>{r.nombre}</td><td>{r.categoria}</td><td>{r.stock}</td><td>{money(r.costo)}</td><td>{money(r.precio)}</td><td className={r.errores.length?'text-red':''}>{r.errores.join(' · ')||'Listo para importar'}</td></tr>)}</tbody></table></div><p className="table-foot">Si una fila falla, no se guarda ninguna. Los códigos existentes no se sobrescriben.</p></section>}
 </div>
}
