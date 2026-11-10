export const money = n => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(n || 0))
export const date = n => new Date(n).toLocaleString('es-GT', { timeZone: 'America/Guatemala', dateStyle: 'medium', timeStyle: 'short' })
export function download(name, content, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['\ufeff', content], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function csvCell(value) { return '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"' }
export function parseCSV(text) {
  text = text.replace(/^\ufeff/, '')
  const delimiter = text.split(/\r?\n/)[0].includes(';') ? ';' : ','
  const rows = []; let row = [], field = '', quoted = false
  for (let j = 0; j < text.length; j++) {
    const c = text[j]
    if (c === '"') { if (quoted && text[j + 1] === '"') { field += '"'; j++ } else if (quoted || field === '') quoted = !quoted; else throw new Error('Comillas inválidas en el CSV.') }
    else if (c === delimiter && !quoted) { row.push(field); field = '' }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[j+1] === '\n') j++; row.push(field); if (row.some(x => x.trim())) rows.push(row); row = []; field = '' }
    else field += c
  }
  if (quoted) throw new Error('Hay comillas sin cerrar en el archivo.')
  row.push(field); if (row.some(x => x.trim())) rows.push(row)
  if (rows.length < 2) throw new Error('El archivo debe tener encabezados y al menos un producto.')
  const headers = rows.shift().map(x => x.trim().toLowerCase())
  for (const key of ['codigo', 'nombre', 'categoria', 'precio', 'costo', 'stock']) if (!headers.includes(key)) throw new Error(`Falta la columna ${key}. Descarga la plantilla.`)
  if (new Set(headers).size !== headers.length) throw new Error('Hay encabezados duplicados.')
  if (rows.length > 1000) throw new Error('El máximo es de 1000 productos por archivo.')
  return rows.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Fila ${index + 2}: cantidad de columnas incorrecta.`)
    const p = Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() || '']))
    return { codigo:p.codigo, nombre:p.nombre, categoria:p.categoria, descripcion:p.descripcion || '', precio:p.precio, costo:p.costo, stock:p.stock, stock_minimo:p.stock_minimo === undefined || p.stock_minimo === '' ? '5' : p.stock_minimo }
  })
}
export function validateRows(rows, products) {
  const seen = new Set(products.map(p => String(p.codigo || '').trim().toLowerCase()).filter(Boolean))
  return rows.map((p, index) => {
    const errors = []
    for (const k of ['codigo','nombre','categoria']) if (!p[k] || p[k].length > 200) errors.push(`${k}: obligatorio, máximo 200 caracteres`)
    const code = p.codigo.toLowerCase()
    if (seen.has(code)) errors.push('Código duplicado'); seen.add(code)
    for (const k of ['precio','costo','stock','stock_minimo']) {
      const n = Number(p[k]); if (p[k] === '' || !Number.isFinite(n) || n < 0 || n > 99999999 || (k === 'precio' && n === 0) || (['stock','stock_minimo'].includes(k) && !Number.isInteger(n)) || (['precio','costo'].includes(k) && !/^\d+(\.\d{1,2})?$/.test(String(p[k])))) errors.push(`${k}: valor inválido`)
    }
    return { ...p, fila:index+2, errores:errors }
  })
}
