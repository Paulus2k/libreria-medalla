async function todas(db, tabla, select = '*') {
  const rows = []; let offset = 0;
  while (true) {
    const { data, error } = await db.from(tabla).select(select).order('id').range(offset, offset + 999);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    rows.push(...data); if (data.length < 1000) return rows; offset += 1000;
  }
}
async function ventasUnificadas(db) {
 const [old, current] = await Promise.all([todas(db,'ventas','*, detalle_ventas(*, productos(nombre, codigo))'),todas(db,'comercio_facturas')]);
 return [
   ...old.map(v=>({...v,origen:'anterior',referencia:`ANT-${v.id}`,costo_total:null,items:(v.detalle_ventas||[]).map(i=>({...i,nombre:i.productos?.nombre||'Producto anterior',codigo:i.productos?.codigo||'',subtotal:i.subtotal??Number(i.precio_unitario)*i.cantidad}))})),
   ...current.map(v=>({...v,origen:'caja',referencia:`MED-${String(v.id).padStart(6,'0')}`}))
 ].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
}
module.exports={todas,ventasUnificadas};
