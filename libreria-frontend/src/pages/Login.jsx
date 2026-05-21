import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BookOpen, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

async function handleSubmit(e) {
  e.preventDefault()
  console.log('Submit ejecutado, form:', form)  // ← nuevo
  if (!form.email || !form.password) {
    setError('Por favor completa todos los campos.')
    return
  }
  setLoading(true)
  try {
    await login(form.email, form.password)  // ← el fix principal
    navigate('/dashboard')
  } catch (err) {
    console.error('Error completo:', err)
    setError(err.message)
  } finally {
    setLoading(false)
  }
}

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--cream)',
      overflow: 'hidden',
    }}>
      {/* Panel decorativo izquierdo */}
      <div style={{
        flex: '0 0 420px',
        background: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Patrón de fondo */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(200,149,42,0.04) 40px, rgba(200,149,42,0.04) 41px),
            repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(200,149,42,0.03) 40px, rgba(200,149,42,0.03) 41px)
          `,
          pointerEvents: 'none',
        }} />
        {/* Círculo decorativo */}
        <div style={{
          position: 'absolute',
          bottom: -80,
          right: -80,
          width: 300,
          height: 300,
          border: '40px solid rgba(200,149,42,0.07)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute',
          top: -40,
          left: -40,
          width: 200,
          height: 200,
          border: '30px solid rgba(200,149,42,0.05)',
          borderRadius: '50%',
        }} />

        <div style={{ position: 'relative' }}>
          <BookOpen size={40} color="var(--gold)" style={{ marginBottom: 28 }} />
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.2rem',
            fontWeight: 700,
            color: 'var(--cream)',
            lineHeight: 1.15,
            marginBottom: 16,
          }}>
            Librería<br />
            <span style={{ color: 'var(--gold-light)' }}>Medalla<br />Milagrosa</span>
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--parchment)',
            opacity: 0.55,
            lineHeight: 1.7,
          }}>
            Sistema de gestión de inventario y ventas.<br />
            Ingresa para administrar tu librería.
          </p>

          <div style={{
            marginTop: 48,
            padding: '20px 0',
            borderTop: '1px solid rgba(200,149,42,0.2)',
          }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--parchment)', opacity: 0.3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Proyecto de Tesis · 2026
            </p>
          </div>
        </div>
      </div>

      {/* Panel del formulario */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem',
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: 8,
          }}>
            Iniciar sesión
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', opacity: 0.55, marginBottom: 36 }}>
            Ingresa tus credenciales para continuar
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input
                className="form-input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--parchment)',
                    display: 'flex',
                    padding: 0,
                  }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--red-pale)',
                color: 'var(--red-anular)',
                borderRadius: 'var(--radius)',
                fontSize: '0.85rem',
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: '0.95rem' }}
            >
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Ingresando…</>
                : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
