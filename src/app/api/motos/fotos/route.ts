import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@/lib/supabase/server'
import { esAdmin } from '@/lib/auth/roles'

function r2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (!esAdmin(perfil?.rol)) return null
  return user
}

function publicUrlFor(key: string) {
  return `${process.env.R2_PUBLIC_URL}/${key}`
}

function keyFromUrl(url: string): string | null {
  const base = process.env.R2_PUBLIC_URL
  if (!base || !url.startsWith(`${base}/`)) return null
  return url.slice(base.length + 1)
}

export async function POST(req: Request) {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 403 })

  const formData = await req.formData()
  const motoId = formData.get('motoId')
  if (typeof motoId !== 'string' || !motoId) {
    return Response.json({ error: 'Falta motoId' }, { status: 400 })
  }
  const files = formData.getAll('file').filter((f): f is File => f instanceof File)
  if (files.length === 0) {
    return Response.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }

  const client = r2Client()
  const bucket = process.env.R2_BUCKET_NAME!
  const urls: string[] = []
  const errors: string[] = []

  for (const file of files) {
    const key = `${motoId}/${crypto.randomUUID()}-${file.name}`
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: file.type || 'application/octet-stream',
      }))
      urls.push(publicUrlFor(key))
    } catch (err) {
      errors.push(`${file.name}: ${err instanceof Error ? err.message : 'error desconocido'}`)
    }
  }

  if (urls.length === 0) {
    return Response.json({ error: `No se pudo subir ninguna foto: ${errors.join('; ')}` }, { status: 502 })
  }
  return Response.json({ urls, errors: errors.length > 0 ? errors : undefined })
}

export async function DELETE(req: Request) {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const url = body?.url
  if (typeof url !== 'string' || !url) {
    return Response.json({ error: 'Falta url' }, { status: 400 })
  }
  const key = keyFromUrl(url)
  if (!key) {
    return Response.json({ error: 'URL no pertenece al bucket configurado' }, { status: 400 })
  }

  try {
    await r2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }))
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'No se pudo eliminar' }, { status: 502 })
  }
  return Response.json({ ok: true })
}
