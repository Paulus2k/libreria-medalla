const express  = require("express");
const router   = express.Router();
const supabase = require("../supabaseClient");

// ── PROVEEDORES ──

// GET /proveedores
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .eq('activo',req.query.archivados==='1'?false:true)
    .order("nombre");
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// POST /proveedores
router.post("/", async (req, res) => {
  const { nombre, correo, telefono, locacion } = req.body;
  if (!nombre) return res.status(400).json({ success: false, message: "Nombre requerido" });
  const { data, error } = await supabase
    .from("proveedores")
    .insert([{ nombre, correo, telefono, locacion }])
    .select()
    .single();
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
});

// PUT /proveedores/:id
router.put("/:id", async (req, res) => {
  const { nombre, correo, telefono, locacion } = req.body;
  const { data, error } = await supabase
    .from("proveedores")
    .update({ nombre, correo, telefono, locacion })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// DELETE /proveedores/:id
router.delete("/:id", async (req, res) => {
  const {data:pagos,error:consulta}=await supabase.from('pagos_proveedores').select('id').eq('proveedor_id',req.params.id).eq('estado','pendiente').limit(1);
  if(consulta)return res.status(400).json({message:consulta.message});
  if(pagos.length)return res.status(409).json({message:'Este proveedor tiene pagos pendientes. Resuélvelos antes de archivarlo.'});
  const { data, error } = await supabase.from("proveedores").update({activo:false}).eq("id", req.params.id).select('id').maybeSingle();
  if (error) return res.status(400).json({ success: false, message: error.message });
  if(!data)return res.status(404).json({message:'Proveedor no encontrado'});
  res.json({ success: true, message: "Proveedor archivado. Se conserva el historial de pagos." });
});

// ── PAGOS ──
router.put('/:id/restaurar',async(req,res)=>{
 const {data,error}=await supabase.from('proveedores').update({activo:true}).eq('id',req.params.id).select().single();
 if(error)return res.status(400).json({message:error.message});res.json({data});
});

// GET /proveedores/:id/pagos
router.get("/:id/pagos", async (req, res) => {
  const { data, error } = await supabase
    .from("pagos_proveedores")
    .select("*")
    .eq("proveedor_id", req.params.id)
    .order("fecha_pago");
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// GET /proveedores/pagos/todos — todos los pagos con info del proveedor
router.get("/pagos/todos", async (req, res) => {
  const { data, error } = await supabase
    .from("pagos_proveedores")
    .select("*, proveedores(nombre)")
    .order("fecha_pago");
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// POST /proveedores/:id/pagos
router.post("/:id/pagos", async (req, res) => {
  const { monto, fecha_pago, notas } = req.body;
  if (!Number.isFinite(Number(monto)) || Number(monto)<=0 || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_pago||''))
    return res.status(400).json({ success: false, message: "Monto y fecha son requeridos" });
  const {data:proveedor,error:consulta}=await supabase.from('proveedores').select('activo').eq('id',req.params.id).single();
  if(consulta||!proveedor)return res.status(404).json({message:'Proveedor no encontrado'});
  if(!proveedor.activo)return res.status(409).json({message:'Restaura el proveedor antes de registrar un pago nuevo.'});
  const { data, error } = await supabase
    .from("pagos_proveedores")
    .insert([{ proveedor_id: req.params.id, monto, fecha_pago, notas, estado: "pendiente" }])
    .select()
    .single();
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
});

// PUT /proveedores/pagos/:pagoId/marcar-pagado
router.put("/pagos/:pagoId/marcar-pagado", async (req, res) => {
  const {data,error}=await supabase.rpc('conta_pagar_proveedor',{pago_id:req.params.pagoId,cuenta:req.body?.cuenta||'',contrapartida:req.body?.contrapartida||'',usuario:String(req.usuario.id)});
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// DELETE /proveedores/pagos/:pagoId
router.put('/pagos/:pagoId',async(req,res)=>{
 const cambios={};for(const k of ['notas','calendario_eventos'])if(req.body[k]!==undefined)cambios[k]=req.body[k];
 if(req.body.monto!==undefined){if(!Number.isFinite(Number(req.body.monto))||Number(req.body.monto)<=0)return res.status(400).json({message:'Monto inválido'});cambios.monto=Number(req.body.monto)}
 if(req.body.fecha_pago!==undefined){if(!/^\d{4}-\d{2}-\d{2}$/.test(req.body.fecha_pago))return res.status(400).json({message:'Fecha inválida'});cambios.fecha_pago=req.body.fecha_pago}
 const {data:actual,error:lectura}=await supabase.from('pagos_proveedores').select('*').eq('id',req.params.pagoId).single();
 if(lectura)return res.status(404).json({message:'Pago no encontrado'});
 if(actual.estado==='pagado'&&(cambios.monto!==undefined||cambios.fecha_pago!==undefined))return res.status(409).json({message:'En un pago realizado solo puedes editar notas y recordatorios.'});
 const {data,error}=await supabase.from('pagos_proveedores').update(cambios).eq('id',req.params.pagoId).select().single();
 if(error)return res.status(400).json({message:error.message});res.json({data});
});
router.delete("/pagos/:pagoId", async (req, res) => {
  const { data, error } = await supabase.from("pagos_proveedores").delete().eq("id", req.params.pagoId).eq('estado','pendiente').select('id');
  if (error) return res.status(400).json({ success: false, message: error.message });
  if(!data.length)return res.status(409).json({message:'Los pagos realizados se conservan; solo puedes borrar pendientes.'});
  res.json({ success: true, message: "Pago eliminado" });
});

module.exports = router;
