// Limpieza best-effort de fotos en Cloudflare R2 tras vender una moto (su fila
// ya fue borrada de `motos` por crear_venta_moto). Si esto falla, no revierte
// ni bloquea la venta — solo queda espacio ocupado en R2 hasta limpiarlo a mano.
export async function borrarFotosR2(urls: string[] | undefined | null) {
  if (!urls || urls.length === 0) return
  await Promise.allSettled(
    urls.map(url =>
      fetch('/api/motos/fotos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
    )
  )
}
