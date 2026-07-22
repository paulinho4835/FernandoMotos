// Comprime una foto en el navegador antes de subirla a R2: redimensiona al
// máximo 1440px de lado mayor y reencodea a JPEG calidad 0.6. Una foto de
// celular (3-8MB) suele terminar en 100-300KB, sin perder utilidad para
// mostrarla en pantalla.
const MAX_DIMENSION = 1440
const JPEG_QUALITY = 0.6

async function decodeViaBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  return await createImageBitmap(file)
}

// Respaldo para navegadores/formatos donde createImageBitmap falla (algunos
// no soportan ciertos JPEG con perfiles de color raros, por ejemplo).
// Timeout defensivo: si ni onload ni onerror disparan (no debería pasar con
// un blob local, pero mejor no colgar la subida), se rinde y sube el original.
function decodeViaImgElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const timer = setTimeout(() => reject(new Error('Timeout al decodificar la imagen')), 5000)
    const img = new Image()
    img.onload = () => { clearTimeout(timer); resolve(img) }
    img.onerror = () => { clearTimeout(timer); URL.revokeObjectURL(url); reject(new Error('No se pudo decodificar la imagen')) }
    img.src = url
  })
}

function drawToCanvas(source: ImageBitmap | HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D no disponible')
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

function sourceSize(source: ImageBitmap | HTMLImageElement) {
  if (source instanceof HTMLImageElement) return { width: source.naturalWidth, height: source.naturalHeight }
  return { width: source.width, height: source.height }
}

// Devuelve el archivo comprimido y si la compresión realmente se aplicó.
// Si ambos métodos de decodificación fallan, sube el archivo original
// (nunca bloquea la subida) pero avisa al llamador para que informe al usuario.
export async function compressImage(file: File): Promise<{ file: File; comprimido: boolean }> {
  if (!file.type.startsWith('image/')) return { file, comprimido: false }

  let source: ImageBitmap | HTMLImageElement | null = null
  try {
    source = await decodeViaBitmap(file)
  } catch {
    try {
      source = await decodeViaImgElement(file)
    } catch {
      return { file, comprimido: false }
    }
  }

  try {
    let { width, height } = sourceSize(source)
    if (width === 0 || height === 0) return { file, comprimido: false }
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }

    const canvas = drawToCanvas(source, width, height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (source instanceof HTMLImageElement && source.src.startsWith('blob:')) URL.revokeObjectURL(source.src)
    if (!blob) return { file, comprimido: false }
    if (blob.size >= file.size) return { file, comprimido: false }

    const nombreSinExt = file.name.replace(/\.[^./\\]+$/, '')
    return { file: new File([blob], `${nombreSinExt}.jpg`, { type: 'image/jpeg' }), comprimido: true }
  } catch {
    return { file, comprimido: false }
  }
}
