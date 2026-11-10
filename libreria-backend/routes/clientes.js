const express  = require("express");
const router   = express.Router();
const supabase = require("../supabaseClient");
const {todas}=require('../lib/ventasUnificadas');
router.use((req,res,next)=>{
 if(!['POST','PUT'].includes(req.method))return next();
 const p=req.body;
 if(!p.nombre?.trim()||!['contado','credito'].includes(p.tipo_cliente||'contado')||!Number.isFinite(Number(p.limite_credito||0))||Number(p.limite_credito||0)<0||!Number.isInteger(Number(p.plazo_dias??30))||Number(p.plazo_dias??30)<0||Number(p.plazo_dias??30)>365)return res.status(400).json({message:'Revisa nombre, tipo de cliente, límite y plazo (0 a 365 días).'});
 next();
});

// GET /clientes
router.get("/", async (req, res) => {
  try{
   const [clientes,facturas,abonos]=await Promise.all([todas(supabase,'clientes','*, ventas(id,total,fecha,estado)'),todas(supabase,'comercio_facturas'),todas(supabase,'conta_abonos')]);
   const data=clientes.map(c=>{const nuevas=facturas.filter(f=>f.cliente_ref===String(c.id));const saldo=nuevas.filter(f=>f.estado==='completada'&&f.metodo_pago==='credito').reduce((s,f)=>s+Number(f.total)-abonos.filter(a=>String(a.factura_id)===String(f.id)).reduce((t,a)=>t+Number(a.monto),0),0);return {...c,saldo_credito:saldo,credito_disponible:Math.max(0,Number(c.limite_credito||0)-saldo),ventas:[...(c.ventas||[]),...nuevas.map(f=>({...f,id:`MED-${f.id}`}))]}});
   res.json({data:data.sort((a,b)=>a.nombre.localeCompare(b.nombre))});
  }catch(e){res.status(400).json({message:e.message})}
});

// POST /clientes
router.post("/", async (req, res) => {
  const { nombre, telefono, correo, tipo_cliente='contado',limite_credito=0,plazo_dias=30 } = req.body;
  if (!nombre) return res.status(400).json({ success: false, message: "Nombre requerido" });
  const { data, error } = await supabase
    .from("clientes")
    .insert([{ nombre, telefono, correo, tipo_cliente,limite_credito,plazo_dias }])
    .select().single();
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
});

// PUT /clientes/:id
router.put("/:id", async (req, res) => {
  const { nombre, telefono, correo,tipo_cliente='contado',limite_credito=0,plazo_dias=30 } = req.body;
  const { data, error } = await supabase
    .from("clientes")
    .update({ nombre, telefono, correo,tipo_cliente,limite_credito,plazo_dias })
    .eq("id", req.params.id)
    .select().single();
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// DELETE /clientes/:id
router.delete("/:id", async (req, res) => {
  const {data:historial,error:consulta}=await supabase.from('comercio_facturas').select('id').eq('cliente_ref',req.params.id).limit(1);
  if(consulta)return res.status(400).json({message:consulta.message});
  if(historial.length)return res.status(409).json({message:'El cliente tiene comprobantes asociados. Conserva su historial; puedes editar sus datos o cambiarlo a contado.'});
  const { error } = await supabase.from("clientes").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, message: "Cliente eliminado" });
});

module.exports = router;
