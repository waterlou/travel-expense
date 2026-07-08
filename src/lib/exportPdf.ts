import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib'
import { appUrl } from '@/lib/utils'

const MARGIN = 14
const PAGE_W = 210
const PAGE_H = 297
const CONTENT_W = PAGE_W - MARGIN * 2

const LOCALE_MAP: Record<string, string> = {
  en: 'en-US', zhCN: 'zh-CN', zhTW: 'zh-TW', ja: 'ja-JP', es: 'es-ES', de: 'de-DE', fr: 'fr-FR',
}

const CORAL = rgb(232 / 255, 93 / 255, 117 / 255)
const WHITE = rgb(1, 1, 1)
const BLACK = rgb(0, 0, 0)
const GREEN = rgb(38 / 255, 138 / 255, 38 / 255)
const RED = rgb(200 / 255, 50 / 255, 50 / 255)
const GRAY = rgb(0.4, 0.4, 0.4)

// Metrics — everything in mm
function ptMm(pt: number) { return pt * 0.3528 }
function lineH(pt: number, isCjk = false) {
  const em = ptMm(pt)          // em height in mm
  return isCjk ? em * 1.6 : em * 1.3   // tall enough for CJK (em up from baseline) or Latin (ascent + descent)
}
function baselineOffset(useCjk: boolean, pt: number) {
  return useCjk ? ptMm(pt) : ptMm(pt) * 0.3
}

// CJK detection
function hasCJK(text: string) { return /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(text) }
function needsCjk(travel: any, expenses: any[], t: (k: string) => string): boolean {
  const uiKeys = ['nav.expenses', 'balance.perCurrency', 'common.save', 'expense.amount', 'member.members', 'settings.title']
  if (uiKeys.some(k => hasCJK(t(k)))) return true
  if (hasCJK(travel?.name)) return true
  for (const m of travel?.members || []) { if (hasCJK(m.name)) return true }
  for (const e of expenses || []) { if (hasCJK(e.description)) return true }
  return false
}

// Runtime font cache
let _fontkit: any = null
async function getFontkit() {
  if (!_fontkit) {
    const fk = await import('fontkit' as any)
    _fontkit = (fk as any).default || fk
  }
  return _fontkit
}
let _cjkFontBytes: ArrayBuffer | null = null
async function getCjkFontBytes() {
  if (!_cjkFontBytes) {
    const res = await fetch('https://fonts.gstatic.com/s/notosanssc/v40/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYw.ttf')
    _cjkFontBytes = await res.arrayBuffer()
  }
  return _cjkFontBytes
}

// === Renderer ===
class Renderer {
  doc: PDFDocument
  page!: PDFPage
  fontCjk!: PDFFont
  fontNum!: PDFFont
  y = MARGIN
  t: (k: string) => string
  localeTag: string
  useCjk: boolean

  constructor(doc: PDFDocument, t: (k: string) => string, locale: string, useCjk: boolean) {
    this.doc = doc
    this.t = t
    this.localeTag = LOCALE_MAP[locale] || 'en-US'
    this.useCjk = useCjk
  }

  async init() {
    this.fontNum = await this.doc.embedFont(StandardFonts.Helvetica)
    if (this.useCjk) {
      const fk = await getFontkit()
      if (fk) (this.doc as any).registerFontkit(fk)
      this.fontCjk = await this.doc.embedFont(await getCjkFontBytes())
    } else {
      this.fontCjk = this.fontNum
    }
    this.addPage()
  }

  addPage() {
    this.page = this.doc.addPage([PAGE_W * 2.83465, PAGE_H * 2.83465])
    this.y = MARGIN
  }

  ensure(mm: number) {
    if (this.y + mm > PAGE_H - MARGIN) { this.addPage() }
  }

  // Text at current y, left-aligned.
  // baseline = this.y + baselineOffset (mm below row top)
  yPx(offsetMm: number) { return (PAGE_H - this.y - offsetMm) * 2.83465 }

  txt(text: string, x: number, opts?: { size?: number; color?: typeof BLACK; font?: PDFFont }) {
    const size = opts?.size ?? 8
    const font = opts?.font ?? this.fontCjk
    const color = opts?.color ?? BLACK
    const bo = baselineOffset(this.useCjk, size)
    this.page.drawText(text, { x: x * 2.83465, y: this.yPx(bo), size, font, color })
  }

  // Text at current y, right-aligned
  txtR(text: string, rightX: number, opts?: { size?: number; color?: typeof BLACK; font?: PDFFont }) {
    const size = opts?.size ?? 8
    const font = opts?.font ?? this.fontCjk
    const color = opts?.color ?? BLACK
    const w = font.widthOfTextAtSize(text, size)
    const bo = baselineOffset(this.useCjk, size)
    this.page.drawText(text, { x: (rightX * 2.83465) - w, y: this.yPx(bo), size, font, color })
  }

  // Box at current y. Top edge = this.y, extends DOWN by h mm.
  rect(h: number, color: typeof CORAL) {
    this.page.drawRectangle({
      x: MARGIN * 2.83465,
      y: (PAGE_H - this.y - h) * 2.83465,
      width: CONTENT_W * 2.83465,
      height: h * 2.83465,
      color,
    })
  }

  // Section title: 13pt bold, advance y
  section(title: string) {
    this.ensure(8)
    this.y += 2
    this.txt(title, MARGIN, { size: 13 })
    this.y += ptMm(13) + 2
  }

  // Table helper: header row + data rows
  table(options: {
    headers: string[]
    widths: number[]
    rows: { cells: string[]; colors?: (typeof BLACK)[] }[]
    rightAlign?: number[]
  }) {
    const { headers, widths, rows, rightAlign } = options
    const h = lineH(7, this.useCjk)
    this.ensure(h + 2)
    this.y += 1

    // Header bar + text
    this.rect(h, CORAL)
    headers.forEach((text, i) => {
      const x = MARGIN + widths.slice(0, i).reduce((a, b) => a + b, 0)
      const opts = { size: 7, color: WHITE as typeof BLACK }
      if (rightAlign?.includes(i)) this.txtR(text, x + widths[i], opts)
      else this.txt(text, x, opts)
    })
    this.y += h + 0.5

    // Data rows
    rows.forEach(row => {
      const rh = lineH(7, this.useCjk)
      this.ensure(rh + 1)
      row.cells.forEach((text, i) => {
        const x = MARGIN + widths.slice(0, i).reduce((a, b) => a + b, 0)
        const color = row.colors?.[i] ?? BLACK
        const isNum = /^[+\-]?\d/.test(text) && rightAlign?.includes(i)
        const font = isNum ? this.fontNum : this.fontCjk
        const opts = { size: 7, color, font }
        if (rightAlign?.includes(i)) this.txtR(text, x + widths[i], opts)
        else this.txt(text, x, opts)
      })
      this.y += rh + 0.3
    })
    this.y += 2
  }

  // Format date
  fmtDate(d: string) {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return d
    return dt.toLocaleDateString(this.localeTag, { year: 'numeric', month: 'short', day: 'numeric' })
  }
}

// === Data helpers ===
function safeJson(s: string | null, def: any) { try { return JSON.parse(s || '[]') } catch { return def } }

function calcBals(exps: any[], members: any[], currencies: string[]) {
  const bm: Record<string, Record<string, number>> = {}
  members?.forEach((m: any) => { bm[m.id] = {}; currencies.forEach(c => { bm[m.id][c] = 0 }) })
  const confirmed = exps.filter((e: any) => e.confirmed)
  confirmed.forEach((exp: any) => {
    if (!bm[exp.paidById]) return
    const ep = safeJson(exp.extraPayers, [])
    const epT = ep.reduce((s: number, p: any) => s + (p.amount || 0), 0)
    bm[exp.paidById][exp.currency] += exp.amount - epT
    ep.forEach((p: any) => { if (bm[p.memberId]) bm[p.memberId][exp.currency] += p.amount })
    const mT = exp.splits?.reduce((s: number, sp: any) => s + (sp.amount || 0), 0) || 0
    const mC = exp.splits?.filter((sp: any) => sp.amount != null).length || 0
    const eC = (members?.length || 1) - mC
    exp.splits?.forEach((sp: any) => {
      let a = sp.amount
      if (a == null) a = eC > 0 ? (exp.amount - mT) / eC : 0
      if (bm[sp.memberId]) bm[sp.memberId][exp.currency] -= a
    })
  })
  return bm
}

function displayRows(travel: any, groups: any[], groupMode: boolean): { name: string; mids: string[] }[] {
  if (!groupMode || !groups.length) return travel.members?.map((m: any) => ({ name: m.name, mids: [m.id] })) || []
  const r: { name: string; mids: string[] }[] = []
  groups.forEach((g: any) => r.push({ name: g.name, mids: g.members?.map((m: any) => m.id) || [] }))
  travel.members?.forEach((m: any) => { if (!m.groupId) r.push({ name: m.name, mids: [m.id] }) })
  return r
}

// === Main export ===
export async function exportPdf(
  travel: any, expenses: any[], groups: any[], rates: Record<string, string>, groupMode: boolean,
  t: (k: string) => string, locale = 'en',
) {
  const useCjk = needsCjk(travel, expenses, t)
  const mc = travel.mainCurrency
  const currencies = [mc, ...(JSON.parse(travel.currencies || '[]'))]
  const members = (travel.members || []).sort((a: any, b: any) => a.id.localeCompare(b.id))
  const confirmed = expenses.filter((e: any) => e.confirmed)
  const bm = calcBals(expenses, members, currencies)
  const dRows = displayRows(travel, groups, groupMode)

  const doc = await PDFDocument.create()
  const R = new Renderer(doc, t, locale, useCjk)
  await R.init()

  // ─── Header ───
  R.txt(travel.name, MARGIN, { size: 18 })
  R.y += ptMm(18) + 3
  const ds = new Date().toLocaleDateString(R.localeTag, { year: 'numeric', month: 'long', day: 'numeric' })
  R.txt(`${t('pdf.exported')}: ${ds}  |  ${t('pdf.mainCurrency')}: ${mc}`, MARGIN, { size: 9 })
  R.y += ptMm(9) + 6

  // ─── 1. Expenses ───
  R.section(`1. ${t('nav.expenses')}`)

  const memCount = members.length
  const nameW = Math.min(18, (CONTENT_W - 70) / memCount)
  const expenseWidths = [22, CONTENT_W - 70 - nameW * memCount, 28]
  for (let i = 0; i < memCount; i++) expenseWidths.push(nameW)

  const eRows: { cells: string[]; colors: (typeof BLACK)[] }[] = []
  confirmed.forEach((e: any) => {
    const ep = safeJson(e.extraPayers, [])
    const breakdown = members.map((m: any) => {
      const paid = (m.id === e.paidById ? e.amount : 0) + (ep.find((p: any) => p.memberId === m.id)?.amount || 0)
      const split = e.splits?.find((s: any) => s.memberId === m.id)
      let owe = 0
      if (split) {
        if (split.amount != null) owe = split.amount
        else {
          const mT = e.splits.reduce((s: number, sp: any) => s + (sp.amount || 0), 0)
          const mC = e.splits.filter((sp: any) => sp.amount != null).length
          const eC = members.length - mC
          owe = eC > 0 ? (e.amount - mT) / eC : 0
        }
      }
      return { paid, owe }
    })
    const cells = [R.fmtDate(e.date), e.description || '-', `${e.amount.toFixed(2)} ${e.currency}`,
      ...breakdown.map((b: any) => b.paid > 0 ? `+${b.paid.toFixed(2)}` : '')]
    const colors: (typeof BLACK)[] = [BLACK, BLACK, BLACK, ...breakdown.map((b: any) => b.paid > 0 ? GREEN : BLACK)]
    eRows.push({ cells, colors })

    const cells2 = ['', '', '', ...breakdown.map((b: any) => b.owe > 0 ? `${b.owe.toFixed(2)}` : '')]
    const colors2: (typeof BLACK)[] = [BLACK, BLACK, BLACK, ...breakdown.map((b: any) => b.owe > 0 ? RED : BLACK)]
    eRows.push({ cells: cells2, colors: colors2 })
  })

  R.table({
    headers: [t('expense.date'), t('expense.description'), t('expense.amount'), ...members.map((m: any) => m.name)],
    widths: expenseWidths,
    rows: eRows,
    rightAlign: [2, ...Array.from({ length: memCount }, (_, i) => i + 3)],
  })

  // ─── 2. Balance Per Currency ───
  R.section(`2. ${t('balance.perCurrency')}`)

  const bcWidths = [30, ...Array.from({ length: currencies.length }, () => (CONTENT_W - 30) / currencies.length)]

  R.table({
    headers: [t('balance.entity'), ...currencies],
    widths: bcWidths,
    rows: dRows.map((row: any) => {
      const cells = [row.name, ...currencies.map((c: string) => {
        const bal = row.mids.reduce((s: number, id: string) => s + (bm[id]?.[c] || 0), 0)
        return `${bal >= 0 ? '+' : ''}${bal.toFixed(2)}`
      })]
      const colors: (typeof BLACK)[] = [BLACK, ...currencies.map((c: string) => {
        const bal = row.mids.reduce((s: number, id: string) => s + (bm[id]?.[c] || 0), 0)
        return bal >= 0 ? GREEN : RED
      })]
      return { cells, colors }
    }),
    rightAlign: Array.from({ length: currencies.length }, (_, i) => i + 1),
  })

  // ─── 3. Converted Balance ───
  R.section(`3. ${t('balance.converted')}`)

  const nonMain = currencies.filter((c: string) => c !== mc)
  if (nonMain.length > 0) {
    const rt = nonMain.map(c => rates[c] ? `1 ${c} = ${rates[c]} ${mc}` : `1 ${c} = -`).join(' | ')
    R.txt(`${t('balance.exchangeRates')}: ${rt}`, MARGIN, { size: 7, color: GRAY })
    R.y += ptMm(7) + 3
  }

  R.table({
    headers: [t('balance.entity'), `${t('balance.balance')} (${mc})`],
    widths: [CONTENT_W * 0.5, CONTENT_W * 0.5],
    rows: dRows.map((row: any) => {
      let total = 0
      row.mids.forEach((id: string) => {
        currencies.forEach((c: string) => {
          const bal = bm[id]?.[c] || 0
          if (c === mc) total += bal
          else if (rates[c]) total += bal * parseFloat(rates[c])
        })
      })
      return {
        cells: [row.name, `${total >= 0 ? '+' : ''}${total.toFixed(2)}`],
        colors: [BLACK, total >= 0 ? GREEN : RED],
      }
    }),
    rightAlign: [1],
  })

  // ─── 4. Images ───
  const withImgs = expenses.filter((e: any) => e.imageUrl)
  if (withImgs.length) {
    R.section(`4. ${t('pdf.receiptImages')}`)
    for (const exp of withImgs) {
      R.ensure(24)
      try {
        const res = await fetch(appUrl(exp.imageUrl))
        const blob = await res.blob()
        const ab = await blob.arrayBuffer()
        const ext = exp.imageUrl.match(/\.png$/i)
        let img: any
        try { img = ext ? await R.doc.embedPng(ab) : await R.doc.embedJpg(ab) } catch { img = null }
        if (img) {
          R.page.drawImage(img, {
            x: MARGIN * 2.83465,
            y: (PAGE_H - R.y - 18) * 2.83465,
            width: 30 * 2.83465,
            height: 20 * 2.83465,
          })
        }
      } catch {}
      R.txt(`${R.fmtDate(exp.date)} — ${exp.description || t('pdf.receipt')}`, MARGIN + 33, { size: 7 })
      R.y += 22
    }
  }

  // ─── Save ───
  const pdfBytes = await doc.save()
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${travel.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
