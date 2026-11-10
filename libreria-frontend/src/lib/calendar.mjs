const CLIENT_ID=import.meta.env?.VITE_GOOGLE_CLIENT_ID||'295328208348-7f36s30hpi28v9j5hdspatih38rsbv4a.apps.googleusercontent.com'
let scriptPromise;
async function token(){
 if(!window.google?.accounts?.oauth2){scriptPromise ||= new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=resolve;s.onerror=()=>{scriptPromise=null;reject(new Error('No se pudo cargar Google. Revisa la conexión.'))};document.head.appendChild(s)});await scriptPromise}
 return new Promise((resolve,reject)=>{const client=window.google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:'https://www.googleapis.com/auth/calendar.events',callback:r=>r.error?reject(new Error(r.error)):resolve(r.access_token),error_callback:r=>reject(new Error(r.type||'Se canceló la conexión con Google'))});client.requestAccessToken()});
}
export async function sincronizarPago({id,proveedor,monto,fecha_pago,notas,hora,repetir,cadaHoras,horaFin,eventos=[]}){
 const [hh,mm]=hora.split(':').map(Number),begin=hh*60+mm,[fh,fm]=horaFin.split(':').map(Number),end=fh*60+fm;
 if(!Number.isFinite(begin)||!Number.isFinite(end)||repetir&&(!Number.isFinite(Number(cadaHoras))||Number(cadaHoras)<1||Number(cadaHoras)>24||end<begin))throw new Error('Revisa el horario y el intervalo de recordatorios.');
 const minutes=[begin];if(repetir)for(let t=begin+Number(cadaHoras)*60;t<=end;t+=Number(cadaHoras)*60)minutes.push(t);
 const access=await token();
 async function api(path,method,body){const r=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events'+path,{method,headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json().catch(()=>({}));return {r,d}}
 const ids=[];
 for(let n=0;n<minutes.length;n++){
  const start=new Date(`${fecha_pago}T00:00:00-06:00`);start.setTime(start.getTime()+minutes[n]*60000);const finish=new Date(start.getTime()+30*60000);
  const eventId=eventos[n]||`medpago${String(id).toLowerCase().replace(/[^0-9a-v]/g,'')}v${n}`;
  const body={summary:`Pago a ${proveedor} — Q${Number(monto).toFixed(2)}`,description:notas||'Pago pendiente a proveedor',start:{dateTime:start.toISOString(),timeZone:'America/Guatemala'},end:{dateTime:finish.toISOString(),timeZone:'America/Guatemala'},reminders:{useDefault:false,overrides:[{method:'popup',minutes:0},{method:'email',minutes:60}]}};
  let result=await api('/'+eventId,'PATCH',body);
  if(result.r.status===404||result.r.status===410){result=await api('','POST',{id:eventId,...body});if(result.r.status===409)result=await api('/'+eventId,'PATCH',body)}
  if(!result.r.ok)throw new Error(result.d.error?.message||'Google no pudo guardar el recordatorio.');ids.push(eventId);
 }
 for(const extra of eventos.slice(minutes.length)){const {r,d}=await api('/'+extra,'DELETE');if(!r.ok&&r.status!==404&&r.status!==410)throw new Error(d.error?.message||'No se pudo retirar un recordatorio anterior.')}
 return ids;
}
