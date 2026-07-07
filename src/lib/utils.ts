import { customAlphabet } from 'nanoid'

export function generateInviteCode(): string {
  return customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
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
