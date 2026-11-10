const router=require('express').Router();
const db=require('../supabaseClient');
const {todas}=require('../lib/ventasUnificadas');
router.get('/',async(req,res)=>{
 try{const [config,asientos,abonos]=await Promise.all([todas(db,'conta_config'),todas(db,'conta_asientos'),todas(db,'conta_abonos')]);res.json({data:{config:config[0],asientos,abonos}})}
 catch(e){res.status(400).json({message:e.message})}
});
router.post('/abonos',async(req,res)=>{
 const {data,error}=await db.rpc('conta_abonar',{pago:req.body,usuario:String(req.usuario.id)});
 if(error)return res.status(400).json({message:error.message});res.json({data});
});
router.use((req,res,next)=>req.usuario.rol==='admin'?next():res.status(403).json({message:'Solo un administrador puede registrar apertura o ajustes contables.'}));
router.post('/apertura',async(req,res)=>{
 const {data,error}=await db.rpc('conta_abrir',{configuracion:req.body.config,saldos:req.body.lineas,usuario:String(req.usuario.id)});
 if(error)return res.status(400).json({message:error.message});res.json({data});
});
router.post('/asientos',async(req,res)=>{
 const {data,error}=await db.rpc('conta_guardar',{ref:`manual:${req.body.clave}`,concepto:String(req.body.descripcion||'Asiento manual').slice(0,300),detalle:req.body.lineas,usuario:String(req.usuario.id)});
 if(error)return res.status(400).json({message:error.message});res.json({data});
});
module.exports=router;
