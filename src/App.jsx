import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Waveform from './components/Waveform'

const HOY = new Date().toISOString().slice(0, 10)
const MAX_FECHA = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)

function formatearHora(horaStr) {
  const [h, m] = horaStr.split(':')
  const hora = parseInt(h, 10)
  const ampm = hora >= 12 ? 'pm' : 'am'
  const hora12 = hora % 12 === 0 ? 12 : hora % 12
  return `${hora12}:${m} ${ampm}`
}

function formatearFechaLarga(fechaStr) {
  const fecha = new Date(fechaStr + 'T00:00:00')
  return fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function App() {
  const [paso, setPaso] = useState(1)

  const [sedes, setSedes] = useState([])
  const [audiologos, setAudiologos] = useState([])
  const [horarios, setHorarios] = useState([])

  const [sedeSel, setSedeSel] = useState(null)
  const [audiologoSel, setAudiologoSel] = useState(null)
  const [fechaSel, setFechaSel] = useState(HOY)
  const [horarioSel, setHorarioSel] = useState(null)

  const [form, setForm] = useState({ nombre: '', telefono: '', motivo: '' })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [citaConfirmada, setCitaConfirmada] = useState(false)

  // Paso 1: cargar sedes
  useEffect(() => {
    supabase.from('sedes').select('*').eq('activa', true).order('nombre')
      .then(({ data, error }) => { if (!error) setSedes(data || []) })
  }, [])

  // Paso 2: cargar audiólogos de la sede elegida
  useEffect(() => {
    if (!sedeSel) return
    supabase.from('audiologos').select('*').eq('activo', true).eq('sede_id', sedeSel.id).order('nombre')
      .then(({ data, error }) => { if (!error) setAudiologos(data || []) })
  }, [sedeSel])

  // Paso 4: cargar horarios disponibles cuando hay audiólogo + fecha
  async function buscarHorarios() {
    setCargando(true)
    setError('')
    setHorarios([])
    const { data, error } = await supabase.rpc('horarios_disponibles_publico', {
      p_audiologo_id: audiologoSel.id,
      p_fecha: fechaSel,
    })
    setCargando(false)
    if (error) {
      setError('No pudimos cargar los horarios. Intenta de nuevo.')
      return
    }
    setHorarios(data || [])
  }

  function irAPaso(n) {
    setError('')
    setPaso(n)
  }

  function elegirSede(sede) {
    setSedeSel(sede)
    setAudiologoSel(null)
    irAPaso(2)
  }

  function elegirAudiologo(audiologo) {
    setAudiologoSel(audiologo)
    irAPaso(3)
  }

  async function confirmarFecha() {
    irAPaso(4)
    await buscarHorarios()
  }

  function elegirHorario(slot) {
    setHorarioSel(slot)
    irAPaso(5)
  }

  async function enviarReserva(e) {
    e.preventDefault()
    setError('')
    if (!form.nombre || !form.telefono) {
      setError('Completa tu nombre y teléfono para continuar.')
      return
    }
    setCargando(true)
    const { error } = await supabase.rpc('crear_cita_publica', {
      p_sede_id: sedeSel.id,
      p_audiologo_id: audiologoSel.id,
      p_fecha: fechaSel,
      p_hora_inicio: horarioSel.hora_inicio,
      p_nombre: form.nombre,
      p_telefono: form.telefono,
      p_motivo: form.motivo || null,
    })
    setCargando(false)
    if (error) {
      setError(error.message || 'No se pudo agendar la cita. Intenta con otro horario.')
      return
    }
    setCitaConfirmada(true)
  }

  const totalPasos = 5

  return (
    <div className="wizard-shell">
      <div className="wizard-card">
        <div className="wizard-header">
          <Waveform width={120} height={18} />
          <h1>Agenda tu cita en Aural</h1>
          <p>Elige sede, profesional y el horario que más te sirva.</p>
        </div>

        {!citaConfirmada && (
          <div className="progreso">
            {Array.from({ length: totalPasos }).map((_, i) => (
              <div
                key={i}
                className={`progreso-punto ${i + 1 === paso ? 'activo' : i + 1 < paso ? 'completo' : ''}`}
              />
            ))}
          </div>
        )}

        {citaConfirmada ? (
          <div className="panel confirmacion">
            <div className="icono-ok">✓</div>
            <h2>¡Cita agendada!</h2>
            <p>
              {audiologoSel.nombre} · {sedeSel.nombre}<br />
              {formatearFechaLarga(fechaSel)} · {formatearHora(horarioSel.hora_inicio)}
            </p>
            <p style={{ marginTop: 14 }}>
              Te vamos a confirmar por WhatsApp al número que registraste.
            </p>
          </div>
        ) : (
          <div className="panel">
            {error && <div className="error-box">{error}</div>}

            {/* Paso 1: sede */}
            {paso === 1 && (
              <>
                <h2>¿En qué sede te queda mejor?</h2>
                <p className="subtitulo">Elige la sede más cercana a ti.</p>
                <div className="opciones-lista">
                  {sedes.map((s) => (
                    <button key={s.id} className="opcion-btn" onClick={() => elegirSede(s)}>
                      <div>
                        {s.nombre}
                        <div className="detalle">{s.ciudad}</div>
                      </div>
                      <span className="flecha">›</span>
                    </button>
                  ))}
                  {sedes.length === 0 && <div className="estado-cargando">Cargando sedes…</div>}
                </div>
              </>
            )}

            {/* Paso 2: audiólogo */}
            {paso === 2 && (
              <>
                <button className="btn-volver" onClick={() => irAPaso(1)}>‹ Cambiar sede</button>
                <h2>¿Con quién quieres tu cita?</h2>
                <p className="subtitulo">Profesionales disponibles en {sedeSel.nombre}.</p>
                <div className="opciones-lista">
                  {audiologos.map((a) => (
                    <button key={a.id} className="opcion-btn" onClick={() => elegirAudiologo(a)}>
                      <div>
                        {a.nombre}
                        {a.especialidad && <div className="detalle">{a.especialidad}</div>}
                      </div>
                      <span className="flecha">›</span>
                    </button>
                  ))}
                  {audiologos.length === 0 && (
                    <div className="estado-vacio">No hay profesionales activos en esta sede por ahora.</div>
                  )}
                </div>
              </>
            )}

            {/* Paso 3: fecha */}
            {paso === 3 && (
              <>
                <button className="btn-volver" onClick={() => irAPaso(2)}>‹ Cambiar profesional</button>
                <h2>¿Qué día te sirve?</h2>
                <p className="subtitulo">Con {audiologoSel.nombre} en {sedeSel.nombre}.</p>
                <div className="form-row">
                  <label htmlFor="fecha">Fecha</label>
                  <input
                    id="fecha"
                    type="date"
                    min={HOY}
                    max={MAX_FECHA}
                    value={fechaSel}
                    onChange={(e) => setFechaSel(e.target.value)}
                  />
                </div>
                <button className="btn-primary" onClick={confirmarFecha}>Ver horarios disponibles</button>
              </>
            )}

            {/* Paso 4: horario */}
            {paso === 4 && (
              <>
                <button className="btn-volver" onClick={() => irAPaso(3)}>‹ Cambiar fecha</button>
                <h2>Horarios disponibles</h2>
                <p className="subtitulo">{formatearFechaLarga(fechaSel)}</p>

                {cargando && <div className="estado-cargando">Buscando horarios…</div>}

                {!cargando && horarios.length === 0 && (
                  <div className="estado-vacio">
                    No hay horarios disponibles ese día. Intenta con otra fecha.
                  </div>
                )}

                {!cargando && horarios.length > 0 && (
                  <div className="grid-horarios">
                    {horarios.map((h) => (
                      <button
                        key={h.hora_inicio}
                        className="horario-btn"
                        onClick={() => elegirHorario(h)}
                      >
                        {formatearHora(h.hora_inicio)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Paso 5: datos del paciente */}
            {paso === 5 && (
              <>
                <button className="btn-volver" onClick={() => irAPaso(4)}>‹ Cambiar horario</button>
                <h2>Tus datos</h2>
                <div className="resumen-caja">
                  <strong>{audiologoSel.nombre}</strong> · {sedeSel.nombre}<br />
                  {formatearFechaLarga(fechaSel)} · {formatearHora(horarioSel.hora_inicio)}
                </div>
                <form onSubmit={enviarReserva}>
                  <div className="form-row">
                    <label htmlFor="nombre">Nombre completo</label>
                    <input
                      id="nombre"
                      type="text"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="telefono">WhatsApp</label>
                    <input
                      id="telefono"
                      type="tel"
                      placeholder="573001234567"
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="motivo">Motivo de la consulta (opcional)</label>
                    <input
                      id="motivo"
                      type="text"
                      placeholder="Ej: chequeo, control, adaptación"
                      value={form.motivo}
                      onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    />
                  </div>
                  <button className="btn-primary" type="submit" disabled={cargando}>
                    {cargando ? <span className="spinner" /> : 'Confirmar cita'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
