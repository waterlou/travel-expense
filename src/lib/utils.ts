import { customAlphabet } from 'nanoid'

export function appUrl(path: string): string {
  const bp = typeof process !== 'undefined' ? process.env.BASE_PATH : ''
  return bp ? `${bp}${path}` : path
}

export function generateInviteCode(): string {
  return customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)()
}

// Random 6-char lowercase alnum suffix for slug retries under contention.
const slugSuffix = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6)
export function randomSlugSuffix(): string {
  return slugSuffix()
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

// Active ISO 4217 currency codes. XXX ("no currency") is deliberately
// excluded — it is meaningless as an expense or conversion currency.
const ISO_CURRENCIES = new Set([
  'AED','AFN','ALL','AMD','ANG','AOA','ARS','AUD','AWG','AZN','BAM','BBD','BDT','BGN','BHD','BIF','BMD','BND','BOB','BOV','BRL','BSD','BTN','BWP','BYN','BZD',
  'CAD','CDF','CHE','CHF','CHW','CLF','CLP','CNY','COP','COU','CRC','CUC','CUP','CVE','CZK',
  'DJF','DKK','DOP','DZD',
  'EGP','ERN','ETB','EUR',
  'FJD','FKP',
  'GBP','GEL','GHS','GIP','GMD','GNF','GTQ','GYD',
  'HKD','HNL','HRK','HTG','HUF',
  'IDR','ILS','INR','IQD','IRR','ISK',
  'JMD','JOD','JPY',
  'KES','KGS','KHR','KMF','KPW','KRW','KWD','KYD','KZT',
  'LAK','LBP','LKR','LRD','LSL','LYD',
  'MAD','MDL','MGA','MKD','MMK','MNT','MOP','MRU','MUR','MVR','MWK','MXN','MXV','MYR','MZN',
  'NAD','NGN','NIO','NOK','NPR','NZD',
  'OMR',
  'PAB','PEN','PGK','PHP','PKR','PLN','PYG',
  'QAR',
  'RON','RSD','RUB','RWF',
  'SAR','SBD','SCR','SDG','SEK','SGD','SHP','SLE','SLL','SOS','SRD','SSP','STN','SVC','SYP','SZL',
  'THB','TJS','TMT','TND','TOP','TRY','TTD','TWD','TZS',
  'UAH','UGX','USD','USN','UYI','UYU','UYW','UZS',
  'VED','VES','VND','VUV',
  'WST',
  'XAF','XAG','XAU','XBA','XBB','XBC','XBD','XCD','XDR','XOF','XPD','XPF','XPT','XSU','XTS','XUA',
  'YER',
  'ZAR','ZMW','ZWL',
])

// ISO 4217 currency code: exactly three uppercase letters and whitelisted.
export function isValidCurrency(c: string): boolean {
  return /^[A-Z]{3}$/.test(c) && ISO_CURRENCIES.has(c)
}

// extraPayers must be an array of member ids (extra payers beyond paidById).
export function validateExtraPayers(extraPayers: unknown, memberIds: string[]): string | null {
  if (extraPayers === undefined || extraPayers === null) return null
  if (!Array.isArray(extraPayers)) return 'extraPayers must be an array'
  if (extraPayers.some(id => typeof id !== 'string' || !memberIds.includes(id))) {
    return 'Invalid extra payer'
  }
  return null
}

// splitMemberIds: when provided, must be a non-empty array of member ids.
export function validateSplitMemberIds(splitMemberIds: unknown, memberIds: string[]): string | null {
  if (splitMemberIds === undefined || splitMemberIds === null) return null
  if (!Array.isArray(splitMemberIds) || splitMemberIds.length === 0) {
    return 'splitMemberIds must be a non-empty array'
  }
  if (splitMemberIds.some(id => typeof id !== 'string' || !memberIds.includes(id))) {
    return 'Invalid split member'
  }
  return null
}

// splits map: every key must be a member id, every value a non-negative number
// (or null), and the total of provided amounts must not exceed the expense amount.
export function validateSplits(splits: unknown, memberIds: string[], amount: number): string | null {
  if (splits === undefined || splits === null) return null
  if (typeof splits !== 'object' || Array.isArray(splits)) return 'Invalid splits'
  let sum = 0
  for (const [id, v] of Object.entries(splits as Record<string, unknown>)) {
    if (!memberIds.includes(id)) return `Invalid split member: ${id}`
    if (v === null || v === '') continue
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
    if (!Number.isFinite(n) || n < 0) return 'Split amounts must be non-negative numbers'
    sum += n
  }
  if (sum > amount + 1e-9) return 'Split amounts exceed the expense amount'
  return null
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
