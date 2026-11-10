export const ACCOUNTS={caja:'Caja',bancos:'Bancos',clientes:'Clientes por cobrar',inventario:'Inventario',iva_credito:'IVA crédito fiscal',activos_fijos:'Activos fijos netos',proveedores:'Proveedores por pagar',prestamos:'Préstamos',iva_debito:'IVA débito fiscal',impuestos:'Impuestos por pagar',capital:'Capital',resultados_acumulados:'Resultados acumulados',ventas:'Ventas sin IVA',costo_ventas:'Costo de ventas',gastos:'Gastos operativos',gasto_impuestos:'Gasto por impuestos'}
export const gtDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:new Date(v).toLocaleDateString('sv-SE',{timeZone:'America/Guatemala'})
export function balances(asientos,until){const b=Object.fromEntries(Object.keys(ACCOUNTS).map(k=>[k,0]));for(const a of asientos){if(until&&gtDay(a.fecha)>until)continue;for(const l of a.lineas)b[l.cuenta]=(b[l.cuenta]||0)+Math.round(Number(l.debe)*100)-Math.round(Number(l.haber)*100)}return Object.fromEntries(Object.entries(b).map(([k,v])=>[k,v/100]))}
export function balanceGeneral(b){const activos=['caja','bancos','clientes','inventario','iva_credito','activos_fijos'].reduce((s,k)=>s+(b[k]||0),0);const pasivos=-['proveedores','prestamos','iva_debito','impuestos'].reduce((s,k)=>s+(b[k]||0),0);const resultado=-(b.ventas||0)-(b.costo_ventas||0)-(b.gastos||0)-(b.gasto_impuestos||0);const patrimonio=-(b.capital||0)-(b.resultados_acumulados||0)+resultado;return{activos,pasivos,patrimonio,resultado,diferencia:Math.round((activos-pasivos-patrimonio)*100)/100}}
export function monthlyTaxes(config,entries,month,adjustment=0){
 const period=entries.filter(a=>gtDay(a.fecha).startsWith(month));const b=balances(period);const ventas=-(b.ventas||0),gastos=(b.costo_ventas||0)+(b.gastos||0),utilidad=ventas-gastos;
 const ivaDebito=Math.max(0,-(b.iva_debito||0)),ivaCredito=Math.max(0,b.iva_credito||0);
 const antes=balances(entries.filter(a=>gtDay(a.fecha)<`${month}-01`));const remanente=Math.max(0,(antes.iva_credito||0)+(antes.iva_debito||0));
 const iva=config.regimen==='pendiente'?null:config.regimen==='pequeno'?Math.max(0,ventas)*0.05:Math.max(0,ivaDebito-ivaCredito-remanente);
 const isr=config.isr==='simplificado'?Math.min(Math.max(ventas,0),30000)*0.05+Math.max(ventas-30000,0)*0.07:config.isr==='no_aplica'?0:null;
 // Régimen sobre utilidades: estimación anual acumulada, separada de la escala mensual.
 const year=balances(entries.filter(a=>gtDay(a.fecha).startsWith(month.slice(0,4))&&gtDay(a.fecha)<=`${month}-31`));
 const baseAnual=-(year.ventas||0)-(year.costo_ventas||0)-(year.gastos||0)+Number(adjustment||0);
 return {ventas,costo:b.costo_ventas||0,gastos,utilidad,margen:ventas?utilidad/ventas*100:null,ivaDebito,ivaCredito,remanente,iva,isr,isrAnual:config.isr==='utilidades'?Math.max(0,baseAnual)*.25:null,baseAnual};
}

