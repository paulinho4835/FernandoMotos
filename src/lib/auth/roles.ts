export type Rol = 'admin' | 'vendedor' | 'super_admin'

const ADMIN_ROLES = new Set<string>(['admin', 'super_admin'])

export function esAdmin(rol: string | null | undefined): boolean {
  return rol != null && ADMIN_ROLES.has(rol)
}

export function esSuperAdmin(rol: string | null | undefined): boolean {
  return rol === 'super_admin'
}
