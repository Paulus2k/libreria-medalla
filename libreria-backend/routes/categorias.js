const express  = require("express");
const router   = express.Router();
const supabase = require("../supabaseClient");

// GET /categorias
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .order("nombre");
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// POST /categorias
router.post("/", async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ success: false, message: "Nombre requerido" });
  const { data, error } = await supabase
    .from("categorias")
    .insert([{ nombre: nombre.trim() }])
    .select()
    .single();
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
});

// DELETE /categorias/:id
router.delete("/:id", async (req, res) => {
  // Verificar que no haya productos con esa categoría
  const { data: cat } = await supabase
    .from("categorias").select("nombre").eq("id", req.params.id).single();

  if (!cat) return res.status(404).json({ success: false, message: "Categoría no encontrada" });

  const { count } = await supabase
    .from("productos")
    .select("*", { count: "exact", head: true })
    .eq("categoria", cat.nombre);

  if (count > 0)
    return res.status(400).json({ success: false, message: `No se puede eliminar: ${count} producto(s) usan esta categoría` });

  const { error } = await supabase.from("categorias").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, message: "Categoría eliminada" });
});

module.exports = router;