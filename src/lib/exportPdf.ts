import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const MARGIN = 14
let doc: jsPDF
let mc: string
let currencies: string[]
let travelName: string

function fmt(d: string) {
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function toB64(url: string) {
  try {
    const r = await fetch(url)
    const b = await r.blob()
    return new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(b)
    })
  } catch { return null }
}

function safeJson(s: string | null, def: any) { try { return JSON.parse(s || '[]') } catch { return def } }

function calcBals(exps: any[], members: any[]) {
  const bm: Record<string, Record<string, number>> = {}
  members?.forEach((m: any) => { bm[m.id] = {}; currencies.forEach(c => { bm[m.id][c] = 0 }) })
  const confirmed = exps.filter((e: any) => e.confirmed)
  confirmed.forEach(exp => {
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

function displayRows(travel: any, groups: any[], groupMode: boolean) {
  if (!groupMode || !groups.length) return travel.members?.map((m: any) => ({ name: m.name, mids: [m.id] })) || []
  const r: any[] = []
  groups.forEach((g: any) => r.push({ name: g.name, mids: g.members?.map((m: any) => m.id) || [] }))
  travel.members?.forEach((m: any) => { if (!m.groupId) r.push({ name: m.name, mids: [m.id] }) })
  return r
}

function header(y: number) {
  doc.setFontSize(18)
  doc.text(travelName, MARGIN, y)
  y += 7
  doc.setFontSize(9)
  const ds = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(`Exported: ${ds}  |  Main Currency: ${mc}`, MARGIN, y)
  return y + 10
}

function section(y: number, t: string) {
  if (y > 270) { doc.addPage(); y = MARGIN + 10 }
  doc.setFontSize(13)
  doc.text(t, MARGIN, y)
  return y + 5
}

function tbl(y: number, head: string[], body: string[][]) {
  if (y > 265) { doc.addPage(); y = MARGIN + 8 }
  autoTable(doc, {
    startY: y, head: [head], body,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8 },
    headStyles: { fillColor: [232, 93, 117] },
    tableLineWidth: 0.1, tableLineColor: [200, 200, 200],
  })
  return (doc as any).lastAutoTable.finalY + 8
}

export async function exportPdf(
  travel: any, expenses: any[], groups: any[], rates: Record<string, string>, groupMode: boolean,
) {
  doc = new jsPDF()
  mc = travel.mainCurrency
  travelName = travel.name
  currencies = [mc, ...(JSON.parse(travel.currencies || '[]'))]
  const members = travel.members || []
  const confirmed = expenses.filter((e: any) => e.confirmed)
  const bm = calcBals(expenses, members)
  const dRows = displayRows(travel, groups, groupMode)
  let y = MARGIN

  // === Header ===
  y = header(y)

  // === 1. Expenses ===
  y = section(y, '1. Expenses')
  const memberNames = members.map((m: any) => m.name)
  const eBody: string[][] = []
  confirmed.forEach((e: any) => {
    const ep = safeJson(e.extraPayers, [])
    // Calculate per-member paid and owed
    const breakdown = members.map((m: any) => {
      const paid = (m.id === e.paidById ? e.amount : 0) +
        (ep.find((p: any) => p.memberId === m.id)?.amount || 0)
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
    // Top row: paid amounts
    eBody.push([
      fmt(e.date), e.description || '-', `${e.amount.toFixed(2)} ${e.currency}`,
      ...breakdown.map((b: any) => b.paid > 0 ? `+${b.paid.toFixed(2)}` : ''),
    ])
    // Bottom row: owe amounts
    eBody.push([
      '', '', '',
      ...breakdown.map((b: any) => b.owe > 0 ? `-${b.owe.toFixed(2)}` : ''),
    ])
  })

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Amount', ...memberNames]],
    body: eBody,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8 },
    headStyles: { fillColor: [232, 93, 117] },
    tableLineWidth: 0.1,
    tableLineColor: [200, 200, 200],
    didParseCell(data: any) {
      if (data.section === 'body' && data.column.index >= 3) {
        const isPaidRow = data.row.index % 2 === 0
        data.cell.styles.textColor = isPaidRow ? [38, 138, 38] : [200, 50, 50]
        data.cell.styles.fontSize = 7
      }
    },
  })
  y = (doc as any).lastAutoTable.finalY + 8

  // === 2. Balance Per Currency ===
  y = section(y, '2. Balance Per Currency')
  const bHeaders = ['Entity', ...currencies]
  const bRows = dRows.map((row: any) => [
    row.name,
    ...currencies.map((c: string) => {
      const bal = row.mids.reduce((s: number, id: string) => s + (bm[id]?.[c] || 0), 0)
      return `${bal >= 0 ? '+' : ''}${bal.toFixed(2)}`
    }),
  ])
  y = tbl(y, bHeaders, bRows)

  // === 3. Converted Balance ===
  y = section(y, '3. Converted Balance')
  const nonMain = currencies.filter((c: string) => c !== mc)
  if (nonMain.length > 0) {
    doc.setFontSize(7)
    const rt = nonMain.map(c => rates[c] ? `1 ${c} = ${rates[c]} ${mc}` : `1 ${c} = -`).join('  |  ')
    doc.text(`Exchange rates: ${rt}`, MARGIN, y - 1)
    y += 2
  }
  const convRows = dRows.map((row: any) => {
    let total = 0
    row.mids.forEach((id: string) => {
      currencies.forEach((c: string) => {
        const bal = bm[id]?.[c] || 0
        if (c === mc) total += bal
        else if (rates[c]) total += bal * parseFloat(rates[c])
      })
    })
    return [row.name, `${total >= 0 ? '+' : ''}${total.toFixed(2)}`]
  })
  y = tbl(y, ['Entity', `Balance (${mc})`], convRows)

  // === 4. Images ===
  const withImgs = expenses.filter((e: any) => e.imageUrl)
  if (withImgs.length) {
    y = section(y, '4. Receipt Images')
    for (const exp of withImgs) {
      if (y > 268) { doc.addPage(); y = MARGIN + 10 }
      const b64 = await toB64(exp.imageUrl)
      if (b64) {
        const ext = exp.imageUrl.match(/\.png$/i) ? 'PNG' : 'JPEG'
        doc.addImage(b64, ext, MARGIN, y, 30, 20)
        doc.setFontSize(7)
        doc.text(`${fmt(exp.date)} — ${exp.description || 'receipt'}`, MARGIN + 33, y + 10)
        y += 23
      }
    }
  }

  doc.save(`${travelName.replace(/[^a-zA-Z0-9]/g, '_')}_report.pdf`)
}
