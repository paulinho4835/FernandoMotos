// Normalización de datos dictados/escritos por clientes. Lecciones de
// producción: el usuario dicta el carnet con espacios ("48 35 94 6"), el
// teléfono con guiones, la hora como "2:00 pm" y la fecha como "18/06/2026";
// las búsquedas exactas fallan si no se limpia ANTES de consultar.

// Arguments de un tool call: Vapi y algunos modelos de OpenRouter los mandan
// como OBJETO, otros como string JSON. Nunca hacer JSON.parse a ciegas — el
// bug clásico "el webhook miente con ok": parse falla silencioso, campos
// undefined, insert nunca corre, HTTP 200, el LLM inventa la confirmación.
export function parseToolArgs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return {}
}

// Teléfonos y carnets: solo dígitos (quita espacios, puntos, guiones y "+").
export function normalizeDigits(value: string): string {
  return value.replace(/[\s.\-+]/g, '')
}

// ¿El identificador es numérico (carnet/teléfono) o texto (nombre)? Decide
// qué columna consultar.
export function isNumericIdentity(value: string): boolean {
  return /^\d+$/.test(normalizeDigits(value))
}

// Comparación laxa de nombres: sin tildes, sin mayúsculas, por contención en
// cualquier dirección ("Paulo" ↔ "Paulo León").
export function namesMatch(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
  const na = norm(a)
  const nb = norm(b)
  return na.length > 0 && nb.length > 0 && (na.includes(nb) || nb.includes(na))
}

// Hora dictada → "HH:MM" 24h. Acepta "2:00 pm", "14:00", "2 de la tarde" no
// (eso lo resuelve el LLM); aquí solo formatos numéricos.
export function normalizeTime(value: string): string | null {
  const m = value.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/)
  if (!m) return null
  let hours = Number(m[1])
  const minutes = m[2] ? Number(m[2]) : 0
  const suffix = m[3]?.replace(/\./g, '')
  if (hours > 23 || minutes > 59) return null
  if (suffix === 'pm' && hours < 12) hours += 12
  if (suffix === 'am' && hours === 12) hours = 0
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

// Fecha dictada → "YYYY-MM-DD". Acepta "18/06/2026", "18-06-2026" y el
// formato ISO ya correcto.
export function normalizeDate(value: string): string | null {
  const v = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  return `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
