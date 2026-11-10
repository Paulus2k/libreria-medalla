export async function readExcel(file){
 const {default:ExcelJS}=await import('exceljs');const wb=new ExcelJS.Workbook();
 // Solo necesitamos celdas; omitir vínculos de tablas auxiliares mejora la
 // compatibilidad entre archivos guardados por Excel y otros editores XLSX.
 try{await wb.xlsx.load(await file.arrayBuffer(),{ignoreNodes:['tableParts']})}catch{throw new Error('No se pudo leer el Excel. Usa la plantilla .xlsx, sin macros ni contraseña.')}
 const sheet=wb.getWorksheet('Productos');
 if(!sheet)throw new Error('El Excel debe incluir la hoja Productos de la plantilla.');
 let header=null;sheet.eachRow((row,n)=>{if(!header&&String(row.getCell(1).text).trim()==='codigo'&&String(row.getCell(2).text).trim()==='nombre')header=n});
 if(!header)throw new Error('No se encontraron los encabezados de la plantilla.');
 const mapping={};sheet.getRow(header).eachCell((cell,col)=>mapping[String(cell.text).trim()]=col);
 const required=['codigo','nombre','categoria','stock','costo','precio'];if(required.some(k=>!mapping[k]))throw new Error('Faltan columnas obligatorias de la plantilla.');
 const rows=[];for(let n=header+1;n<=sheet.rowCount;n++){
  const row=sheet.getRow(n),p={};
  for(const k of [...required,'stock_minimo','descripcion']){const c=mapping[k]?row.getCell(mapping[k]):null;if(c?.type===ExcelJS.ValueType.Formula)throw new Error(`Fila ${n}: usa valores en ${k}, no fórmulas.`);p[k]=String(c?.text??'').trim()}
  if(Object.entries(p).every(([k,v])=>!v||k==='stock_minimo'&&v==='5'))continue;
  p.stock_minimo ||= '5';rows.push(p);
 }
 if(!rows.length)throw new Error('No hay productos capturados en la hoja Productos.');
 if(rows.length>1000)throw new Error('Máximo 1000 productos por carga.');return rows;
}
