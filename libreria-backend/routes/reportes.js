const express  = require("express");
const router   = express.Router();
const supabase = require("../supabaseClient");

router.get("/resumen", async (req, res) => {
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();

  const [{ count: totalProductos }, { data: ventas }, { data: stockBajo }] = await Promise.all([
    supabase.from("productos").select("*", { count: "exact", head: true }),
    supabase.from("ventas").select("total, estado, fecha").eq("estado", "completada"),
    supabase.from("productos").select("id").lte("stock", 5)
  ]);

  const ventasHoy = ventas?.filter(v => v.fecha >= inicioHoy) || [];
  const ventasMes = ventas?.filter(v => v.fecha >= inicioMes) || [];
  const totalMes  = ventasMes.reduce((s, v) => s + parseFloat(v.total), 0);

  res.json({
    success: true,
    data: {
      ventas_hoy:            ventasHoy.reduce((s, v) => s + parseFloat(v.total), 0),
      ventas_mes:            parseFloat(totalMes.toFixed(2)),
      total_productos:       totalProductos,
      productos_bajo_stock:  stockBajo?.length || 0,
      num_ventas:            ventasMes.length,
      ticket_promedio:       ventasMes.length ? parseFloat((totalMes / ventasMes.length).toFixed(2)) : 0,
    }
  });
});

router.get("/ventas-por-dia", async (req, res) => {
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);

  const { data, error } = await supabase
    .from("ventas")
    .select("fecha, total")
    .eq("estado", "completada")
    .gte("fecha", hace30.toISOString())
    .order("fecha");

  if (error) return res.status(500).json({ success: false, message: error.message });

  const porDia = {};
  data.forEach(v => {
    const dia = v.fecha.split("T")[0];
    if (!porDia[dia]) porDia[dia] = { fecha: dia, total: 0, cantidad: 0 };
    porDia[dia].total    += parseFloat(v.total);
    porDia[dia].cantidad += 1;
  });

  res.json({ success: true, data: Object.values(porDia) });
});

router.get("/productos-mas-vendidos", async (req, res) => {
  const { data, error } = await supabase
    .from("detalle_ventas")
    .select(`cantidad, productos(nombre, categoria)`)
    .order("cantidad", { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });

  const agrupado = {};
  data.forEach(d => {
    const nombre = d.productos?.nombre || "Desconocido";
    if (!agrupado[nombre]) agrupado[nombre] = { nombre, categoria: d.productos?.categoria, total_vendido: 0 };
    agrupado[nombre].total_vendido += d.cantidad;
  });

  const resultado = Object.values(agrupado)
    .sort((a, b) => b.total_vendido - a.total_vendido)
    .slice(0, 10);

  res.json({ success: true, data: resultado });
});

module.exports = router;