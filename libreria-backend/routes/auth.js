const express   = require("express");
const router    = express.Router();
const supabase  = require("../supabaseClient");
const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secreto_libreria_2026";

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email y contraseña requeridos" });

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !usuario)
    return res.status(401).json({ success: false, message: "Credenciales incorrectas" });

  const valido = await bcrypt.compare(password, usuario.password_hash);
  if (!valido)
    return res.status(401).json({ success: false, message: "Credenciales incorrectas" });

  const token = jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    success: true,
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
  });
});

// POST /auth/registro (solo admin puede crear usuarios)
router.post("/registro", async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password)
    return res.status(400).json({ success: false, message: "Faltan campos requeridos" });

  const hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("usuarios")
    .insert([{ nombre, email, password_hash: hash, rol: rol || "empleado" }])
    .select()
    .single();

  if (error)
    return res.status(400).json({ success: false, message: error.message });

  res.status(201).json({
    success: true,
    message: "Usuario creado",
    usuario: { id: data.id, nombre: data.nombre, email: data.email, rol: data.rol }
  });
});

module.exports = router;