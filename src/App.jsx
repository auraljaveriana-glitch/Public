import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabaseClient'

const ORDEN_CIUDADES = ['bogota', 'cali', 'medellin', 'cartagena', 'barranquilla']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_CABECERA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const pad = (n) => String(n).padStart(2, '0')
const aISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const sinTildes = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const deISO = (iso) => new Date(iso + 'T00:00:00')

// Fechas calculadas con la hora local del navegador (no UTC) para que "hoy" sea el de Colombia
const AHORA = new Date()
const HOY_DATE = new Date(AHORA.getFullYear(), AHORA.getMonth(), AHORA.getDate())
const HOY_ISO = aISO(HOY_DATE)
const MAX_DATE = new Date(HOY_DATE.getTime() + 60 * 86400000)

function formatearHora(horaStr) {
  const [h, m] = horaStr.split(':')
  const hora = parseInt(h, 10)
  const ampm = hora >= 12 ? 'pm' : 'am'
  const hora12 = hora % 12 === 0 ? 12 : hora % 12
  return `${hora12}:${m} ${ampm}`
}

const horaCompacta = (horaStr) => formatearHora(horaStr).replace(' ', '')

function fechaCorta(iso) {
  const d = deISO(iso)
  return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES_CORTOS[d.getMonth()]}`
}

function fechaLarga(iso) {
  const d = deISO(iso)
  return `${d.getDate()} de ${MESES[d.getMonth()]}`
}

function Chevron({ abajo = false }) {
  return (
    <svg className="chevron" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"
      style={abajo ? { transform: 'rotate(90deg)' } : undefined}>
      <path d="M4.5 1.5 10 7l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Calendario({ vista, onCambiarMes, fechaSel, onElegir }) {
  const { anio, mes } = vista
  const primerDia = (new Date(anio, mes, 1).getDay() + 6) % 7 // semana empieza en lunes
  const totalDias = new Date(anio, mes + 1, 0).getDate()

  const celdas = []
  for (let i = 0; i < primerDia; i++) celdas.push(null)
  for (let d = 1; d <= totalDias; d++) celdas.push(new Date(anio, mes, d))

  const puedeAtras = anio > HOY_DATE.getFullYear() || (anio === HOY_DATE.getFullYear() && mes > HOY_DATE.getMonth())
  const puedeAdelante = anio < MAX_DATE.getFullYear() || (anio === MAX_DATE.getFullYear() && mes < MAX_DATE.getMonth())

  return (
    <div className="calendario">
      <div className="calendario-cabecera">
        <button type="button" onClick={() => onCambiarMes(-1)} disabled={!puedeAtras} aria-label="Mes anterior">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M9.5 1.5 4 7l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span>{MESES[mes].slice(0, 3).toUpperCase()} {anio}</span>
        <button type="button" onClick={() => onCambiarMes(1)} disabled={!puedeAdelante} aria-label="Mes siguiente">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M4.5 1.5 10 7l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="calendario-cuerpo">
        {DIAS_CABECERA.map((d, i) => <div key={'h' + i} className="cal-dow">{d}</div>)}
        {celdas.map((fecha, i) => {
          if (!fecha) return <div key={'v' + i} />
          const iso = aISO(fecha)
          const deshabilitado = fecha < HOY_DATE || fecha > MAX_DATE || fecha.getDay() === 0
          return (
            <button
              key={iso}
              type="button"
              className={`cal-dia ${iso === fechaSel ? 'sel' : ''} ${iso === HOY_ISO ? 'hoy' : ''}`}
              disabled={deshabilitado}
              onClick={() => onElegir(iso)}
            >
              {fecha.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FranjaHorarios({ titulo, slots, horarioSel, onElegir }) {
  if (slots.length === 0) return null
  return (
    <div className="franja">
      <div className="franja-titulo">{titulo}</div>
      <div className="franja-grid">
        {slots.map((h) => (
          <button
            key={h.hora_inicio}
            type="button"
            className={`hora-btn ${horarioSel?.hora_inicio === h.hora_inicio ? 'sel' : ''}`}
            onClick={() => onElegir(h)}
          >
            {formatearHora(h.hora_inicio)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [paso, setPaso] = useState(1)

  const [sedes, setSedes] = useState([])
  const [audiologos, setAudiologos] = useState([])
  const [horarios, setHorarios] = useState([])

  const [sedeSel, setSedeSel] = useState(null)
  const [audiologoSel, setAudiologoSel] = useState(null)
  const [fechaSel, setFechaSel] = useState(null)
  const [horarioSel, setHorarioSel] = useState(null)
  const [vista, setVista] = useState({ anio: HOY_DATE.getFullYear(), mes: HOY_DATE.getMonth() })
  const [refrescar, setRefrescar] = useState(0)

  const [ciudadAbierta, setCiudadAbierta] = useState(undefined)
  const [form, setForm] = useState({ nombre: '', telefono: '', correo: '', cedula: '', eps: '', motivo: '' })
  const [cargando, setCargando] = useState(false)
  const [cargandoHorarios, setCargandoHorarios] = useState(false)
  const [error, setError] = useState('')
  const [citaConfirmada, setCitaConfirmada] = useState(false)

  // Flechas atrás/adelante del navegador
  const estadoRef = useRef({})
  estadoRef.current = { sedeSel, audiologoSel, fechaSel, horarioSel, citaConfirmada }
  useEffect(() => {
    window.history.replaceState({ paso: 1 }, '')
    function alCambiarHistorial(e) {
      const s = estadoRef.current
      if (s.citaConfirmada) { limpiarTodo(); return }
      let n = e.state?.paso ?? 1
      // No dejar entrar a un paso para el que faltan datos (por ejemplo tras recargar)
      if (n >= 2 && !s.sedeSel) n = 1
      if (n >= 3 && !s.audiologoSel) n = 2
      if (n >= 4 && !(s.fechaSel && s.horarioSel)) n = 3
      setError('')
      setPaso(n)
    }
    window.addEventListener('popstate', alCambiarHistorial)
    return () => window.removeEventListener('popstate', alCambiarHistorial)
  }, [])

  // Paso 1: sedes activas
  useEffect(() => {
    supabase.from('sedes').select('*').eq('activa', true).order('nombre')
      .then(({ data, error }) => { if (!error) setSedes(data || []) })
  }, [])

  // Paso 2: audiólogos de la sede elegida
  useEffect(() => {
    if (!sedeSel) return
    supabase.from('audiologos').select('*').eq('activo', true).eq('sede_id', sedeSel.id).order('nombre')
      .then(({ data, error }) => { if (!error) setAudiologos(data || []) })
  }, [sedeSel])

  // Paso 3: horarios libres del audiólogo en la fecha elegida
  useEffect(() => {
    if (!audiologoSel || !fechaSel) return
    let cancelado = false
    setCargandoHorarios(true)
    setHorarios([])
    setHorarioSel(null)
    supabase.rpc('horarios_disponibles_publico', {
      p_audiologo_id: audiologoSel.id,
      p_fecha: fechaSel,
    }).then(({ data, error }) => {
      if (cancelado) return
      setCargandoHorarios(false)
      if (error) {
        setError('No pudimos cargar los horarios. Intenta de nuevo.')
        return
      }
      setHorarios(data || [])
    })
    return () => { cancelado = true }
  }, [audiologoSel, fechaSel, refrescar])

  // Sedes agrupadas por ciudad (Bogotá, Cali, Medellín, Cartagena, Barranquilla y luego el resto)
  const grupos = useMemo(() => {
    const mapa = new Map()
    for (const s of sedes) {
      const key = sinTildes(s.ciudad) || 'otras'
      if (!mapa.has(key)) mapa.set(key, { key, nombre: s.ciudad || 'Otras', sedes: [] })
      mapa.get(key).sedes.push(s)
    }
    const pos = (k) => { const i = ORDEN_CIUDADES.indexOf(k); return i === -1 ? 99 : i }
    return [...mapa.values()].sort((a, b) => pos(a.key) - pos(b.key) || a.nombre.localeCompare(b.nombre))
  }, [sedes])

  const abierta = ciudadAbierta === undefined ? grupos[0]?.key : ciudadAbierta

  // Si la fecha es hoy, no mostrar horas que ya pasaron
  const horariosVisibles = useMemo(() => {
    if (fechaSel !== HOY_ISO) return horarios
    const ahora = new Date()
    const limite = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`
    return horarios.filter((h) => h.hora_inicio.slice(0, 5) > limite)
  }, [horarios, fechaSel])

  const manana = horariosVisibles.filter((h) => h.hora_inicio < '12:00')
  const tarde = horariosVisibles.filter((h) => h.hora_inicio >= '12:00')

  // Cada paso se guarda en el historial del navegador: las flechas atrás/adelante de la página funcionan
  function irAPaso(n) {
    setError('')
    setPaso(n)
    window.history.pushState({ paso: n }, '')
  }

  function elegirSede(sede) {
    setSedeSel(sede)
    setAudiologoSel(null)
    setFechaSel(null)
    setHorarioSel(null)
    setHorarios([])
    irAPaso(2)
  }

  function elegirAudiologo(a) {
    setAudiologoSel(a)
    setFechaSel(null)
    setHorarioSel(null)
    setHorarios([])
    irAPaso(3)
  }

  function cambiarMes(delta) {
    setVista((v) => {
      const d = new Date(v.anio, v.mes + delta, 1)
      return { anio: d.getFullYear(), mes: d.getMonth() }
    })
  }

  function volver() {
    window.history.back()
  }

  function limpiarTodo() {
    setPaso(1)
    setSedeSel(null)
    setAudiologoSel(null)
    setFechaSel(null)
    setHorarioSel(null)
    setHorarios([])
    setForm({ nombre: '', telefono: '', correo: '', cedula: '', eps: '', motivo: '' })
    setCitaConfirmada(false)
    setError('')
  }

  function reiniciar() {
    limpiarTodo()
    window.history.pushState({ paso: 1 }, '')
  }

  async function enviarReserva(e) {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim() || !form.telefono.trim() || !form.eps.trim() || !form.cedula.trim()) {
      setError('Completa tu nombre, WhatsApp, cédula y EPS para continuar.')
      return
    }
    setCargando(true)
    const { error } = await supabase.rpc('crear_cita_publica', {
      p_sede_id: sedeSel.id,
      p_audiologo_id: audiologoSel.id,
      p_fecha: fechaSel,
      p_hora_inicio: horarioSel.hora_inicio,
      p_nombre: form.nombre.trim(),
      p_telefono: form.telefono.trim(),
      p_motivo: form.motivo.trim() || null,
      p_email: form.correo.trim() || null,
      p_eps: form.eps.trim(),
      p_documento: form.cedula.trim(),
    })
    setCargando(false)
    if (error) {
      const tomado = /ya fue tomado/i.test(error.message || '')
      setError(error.message || 'No se pudo agendar la cita. Intenta con otro horario.')
      if (tomado) {
        // Volver a elegir hora con la lista actualizada
        setPaso(3)
        window.history.replaceState({ paso: 3 }, '')
        setRefrescar((n) => n + 1)
      }
      return
    }
    setCitaConfirmada(true)
  }

  const totalPasos = 4

  return (
    <div className="pagina">
      <main className="principal">
        {/* ── Panel izquierdo ── */}
        <section className="hero" aria-hidden="true">
          <h1>
            Agenda<br />
            tu cita<br />
            <span>en Aural</span>
          </h1>
        </section>

        {/* ── Panel derecho ── */}
        <section className="contenido">
          <div className="contenido-interno">
            {citaConfirmada ? (
              <div className="confirmacion">
                <div className="icono-ok">✓</div>
                <h2>¡Cita agendada!</h2>
                <p className="confirmacion-detalle">
                  <strong>{audiologoSel.nombre}</strong><br />
                  {sedeSel.nombre}<br />
                  {sedeSel.direccion && <>{sedeSel.direccion}<br /></>}
                  {fechaCorta(fechaSel)} · {horaCompacta(horarioSel.hora_inicio)}
                </p>
                <p className="subtitulo">Te vamos a confirmar por WhatsApp al número que registraste.</p>
                <button className="btn-primario" type="button" onClick={reiniciar}>Agendar otra cita</button>
              </div>
            ) : (
              <>
                <div className="pasos-barra">
                  <div className="puntos" role="progressbar" aria-valuemin={1} aria-valuemax={totalPasos} aria-valuenow={paso}>
                    {Array.from({ length: totalPasos }).map((_, i) => (
                      <span key={i} className={`punto ${i + 1 === paso ? 'activo' : ''}`} />
                    ))}
                  </div>
                  {paso > 1 && <button className="btn-volver" type="button" onClick={volver}>Volver</button>}
                </div>

                {error && <div className="error-box" role="alert">{error}</div>}

                {/* Paso 1: sede */}
                {paso === 1 && (
                  <>
                    <h2>¿Qué sede te queda mejor?</h2>
                    <p className="subtitulo">Elige la sede más cercana a ti.</p>

                    <div className="acordeon">
                      {grupos.map((g) => {
                        const esAbierta = abierta === g.key
                        return (
                          <div key={g.key} className={`acordeon-item ${esAbierta ? 'abierto' : ''}`}>
                            <button
                              type="button"
                              className="acordeon-cabecera"
                              aria-expanded={esAbierta}
                              onClick={() => setCiudadAbierta(esAbierta ? '' : g.key)}
                            >
                              <span>{g.nombre.toUpperCase()}</span>
                              <Chevron abajo={esAbierta} />
                            </button>
                            {esAbierta && (
                              <div className="sedes-lista">
                                {g.sedes.map((s) => (
                                  <button key={s.id} type="button" className="sede-btn" onClick={() => elegirSede(s)}>
                                    <span>{s.nombre}</span>
                                    {s.direccion && <small>{s.direccion}</small>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {grupos.length === 0 && <div className="estado-vacio">Cargando sedes…</div>}
                    </div>
                  </>
                )}

                {/* Paso 2: profesional */}
                {paso === 2 && (
                  <>
                    <h2>¿Con quién quieres tu cita?</h2>
                    <p className="subtitulo">Profesionales disponibles en {sedeSel.nombre}</p>
                    <div className="lista-prof">
                      {audiologos.map((a) => (
                        <button key={a.id} type="button" className="prof-btn" onClick={() => elegirAudiologo(a)}>
                          <span>
                            <strong>{a.nombre}</strong>
                            {a.especialidad && <small>{a.especialidad}</small>}
                          </span>
                          <Chevron />
                        </button>
                      ))}
                      {audiologos.length === 0 && (
                        <div className="estado-vacio">No hay profesionales activos en esta sede por ahora.</div>
                      )}
                    </div>
                  </>
                )}

                {/* Paso 3: fecha y hora */}
                {paso === 3 && (
                  <>
                    <h2>¿Qué día te sirve?</h2>
                    <p className="subtitulo">Con {audiologoSel.nombre} en {sedeSel.nombre}</p>

                    <div className="fecha-hora">
                      <div className="columna-fecha">
                        <div className="etiqueta">Fecha</div>
                        <Calendario vista={vista} onCambiarMes={cambiarMes} fechaSel={fechaSel} onElegir={setFechaSel} />
                      </div>

                      <div className="columna-horas">
                        <div className="etiqueta">Horarios disponibles</div>
                        {!fechaSel && <p className="nota">Elige un día para ver los horarios.</p>}
                        {fechaSel && cargandoHorarios && <p className="nota">Buscando horarios…</p>}
                        {fechaSel && !cargandoHorarios && horariosVisibles.length === 0 && (
                          <p className="nota">No hay horarios disponibles este día. Prueba con otra fecha.</p>
                        )}
                        {fechaSel && !cargandoHorarios && horariosVisibles.length > 0 && (
                          <>
                            <FranjaHorarios titulo="AM" slots={manana} horarioSel={horarioSel} onElegir={setHorarioSel} />
                            <FranjaHorarios titulo="PM" slots={tarde} horarioSel={horarioSel} onElegir={setHorarioSel} />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="tu-cita">
                      <span className="etiqueta">Tu cita</span>
                      <span className="tu-cita-valor">
                        {fechaSel && horarioSel
                          ? <><strong>{fechaLarga(fechaSel)}</strong> a las <strong>{horaCompacta(horarioSel.hora_inicio)}</strong></>
                          : <em>Elige día y hora</em>}
                      </span>
                    </div>
                    <button
                      className="btn-primario"
                      type="button"
                      disabled={!fechaSel || !horarioSel}
                      onClick={() => irAPaso(4)}
                    >
                      Continuar
                    </button>
                  </>
                )}

                {/* Paso 4: datos */}
                {paso === 4 && (
                  <>
                    <h2>Tus datos</h2>
                    <div className="resumen">
                      <div className="resumen-col">
                        <small>Profesional</small>
                        <span>{audiologoSel.nombre}</span>
                      </div>
                      <div className="resumen-col">
                        <small>Día</small>
                        <span><b>{fechaCorta(fechaSel)}</b> {horaCompacta(horarioSel.hora_inicio)}</span>
                      </div>
                      <div className="resumen-col">
                        <small>Lugar</small>
                        <span>
                          {sedeSel.nombre}
                          {sedeSel.direccion && <i className="dir">{sedeSel.direccion}</i>}
                        </span>
                      </div>
                    </div>

                    <form onSubmit={enviarReserva} className="formulario">
                      <div className="campo campo-completo">
                        <label htmlFor="nombre">Nombre completo</label>
                        <input id="nombre" type="text" autoComplete="name" value={form.nombre}
                          onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                      </div>

                      <div className="campo">
                        <label htmlFor="telefono">WhatsApp</label>
                        <input id="telefono" type="tel" inputMode="tel" autoComplete="tel" placeholder="573001234567"
                          value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} required />
                      </div>
                      <div className="campo">
                        <label htmlFor="correo">Correo <span className="opcional">Opcional</span></label>
                        <input id="correo" type="email" autoComplete="email" value={form.correo}
                          onChange={(e) => setForm({ ...form, correo: e.target.value })} />
                      </div>

                      <div className="campo">
                        <label htmlFor="cedula">Cédula</label>
                        <input id="cedula" type="text" inputMode="numeric" value={form.cedula}
                          onChange={(e) => setForm({ ...form, cedula: e.target.value.replace(/[^0-9]/g, '') })} required />
                      </div>
                      <div className="campo">
                        <label htmlFor="eps">EPS</label>
                        <input id="eps" type="text" placeholder="Ej: Sura, Nueva EPS, Sanitas" value={form.eps}
                          onChange={(e) => setForm({ ...form, eps: e.target.value })} required />
                      </div>

                      <div className="campo campo-completo">
                        <label htmlFor="motivo">Motivo de la consulta <span className="opcional">Opcional</span></label>
                        <input id="motivo" type="text" placeholder="Ej: chequeo, control, adaptación" value={form.motivo}
                          onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
                      </div>

                      <hr className="separador" />
                      <button className="btn-confirmar" type="submit" disabled={cargando}>
                        {cargando ? 'Agendando…' : 'Confirmar cita'}
                      </button>
                    </form>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
