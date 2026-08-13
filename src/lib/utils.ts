import { customAlphabet } from 'nanoid'

export function appUrl(path: string): string {
  const bp = typeof process !== 'undefined' ? process.env.BASE_PATH : ''
  return bp ? `${bp}${path}` : path
}

export function generateInviteCode(): string {
  return customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function uniqueSlug(base: string, checkExists: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = slugify(base) || 'travel'
  let suffix = 0
  while (await checkExists(slug)) {
    suffix++
    slug = `${slugify(base)}-${suffix}`
  }
  return slug
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Strict YYYY-MM-DD calendar date (rejects 2026-02-30, 2026-13-99).
export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

// ISO 4217-shaped currency code: exactly three uppercase letters.
export function isValidCurrency(c: string): boolean {
  return /^[A-Z]{3}$/.test(c)
}

// Expense permission levels are 1-4 (integers); anything else would fall
// through the permission switch and lock everyone out of editing.
export function isValidExpensePermission(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 4
}

const PERMISSIONS = [
  { value: 1, label: 'Only admin can add/edit/delete expenses' },
  { value: 2, label: 'Everyone can add, only admin can edit/delete' },
  { value: 3, label: 'Everyone can add and edit/delete own expenses' },
  { value: 4, label: 'Everyone can add/edit/delete any expense' },
] as const

export function getPermissionLabel(value: number): string {
  return PERMISSIONS.find(p => p.value === value)?.label ?? 'Unknown'
}

export function canAddExpense(isAdmin: boolean, permission: number): boolean {
  if (permission === 1) return isAdmin
  return true
}

export function canEditExpense(isAdmin: boolean, isCreator: boolean, permission: number): boolean {
  switch (permission) {
    case 1: return isAdmin
    case 2: return isAdmin
    case 3: return isAdmin || isCreator
    case 4: return true
    default: return false
  }
}

export function canDeleteExpense(isAdmin: boolean, isCreator: boolean, permission: number): boolean {
  return canEditExpense(isAdmin, isCreator, permission)
}
