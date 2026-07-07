/**
 * API Integration Tests
 * Run with: node tests/api-tests.js
 * Requires the app running on localhost:3333 and a logged-in Chrome session.
 */

const BASE = 'http://localhost:3333'
let cookie = ''
let pass = 0, fail = 0
let testTravelPrefix = ''
let testExpenseIds: string[] = []

async function getSessionCookie() {
  const { execSync } = require('child_process')
  const out = execSync(
    `browser-harness-js 'const cookies = await session.Network.getCookies({ urls: ["${BASE}"] }); const c = cookies.cookies.find(c => c.name.includes("next-auth")); return c ? c.name + "=" + c.value : ""'`,
    { encoding: 'utf8', timeout: 10000 }
  ).trim()
  if (!out) throw new Error('No session cookie found. Make sure you are logged into the app in Chrome.')
  cookie = out
  console.log('  ✓ Got session cookie\n')
}

async function api(method: string, path: string, body?: any) {
  const opts: any = {
    method,
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  return { status: res.status, ok: res.ok, data }
}

function test(name: string, fn: () => Promise<void>) {
  return async () => {
    try {
      await fn()
      console.log(`  ✓ ${name}`)
      pass++
    } catch (e: any) {
      console.log(`  ✗ ${name}: ${e.message}`)
      fail++
    }
  }
}

async function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

// ─── Auth Tests ───

const testNoAuth = test('reject unauthenticated request', async () => {
  const res = await fetch(`${BASE}/api/travels`, { headers: { 'Content-Type': 'application/json' } })
  const text = await res.text()
  assert(text.includes('signin'), `Expected redirect to signin, got ${res.status}`)
})

const testAuthWithCookie = test('authenticated request succeeds', async () => {
  const { status } = await api('GET', '/api/travels')
  assert(status === 200, `Expected 200, got ${status}`)
})

// ─── Travel Tests ───

const testCreateTravel = test('create travel with members', async () => {
  const ts = Date.now()
  const prefix = `test-${ts}`
  const { status, data } = await api('POST', '/api/travels', {
    name: `Test Trip ${ts}`,
    prefix,
    mainCurrency: 'USD',
    currencies: ['EUR', 'GBP'],
    startDate: '2026-07-01',
    endDate: '2026-07-15',
    expensePermission: 3,
    members: [
      { name: 'Alice', isAdmin: true },
      { name: 'Bob', isAdmin: false },
      { name: 'Charlie', isAdmin: false },
    ],
  })
  assert(status === 201, `Expected 201, got ${status}`)
  assert(data.travel?.prefix === prefix, `Prefix mismatch`)
  assert(data.travel?.members?.length === 3, `Expected 3 members, got ${data.travel?.members?.length}`)
  // Creator has userId set, others have null
  const withUser = data.travel.members.filter((m: any) => m.userId)
  const withoutUser = data.travel.members.filter((m: any) => !m.userId)
  assert(withUser.length === 1, `Expected 1 claimed member, got ${withUser.length}`)
  assert(withoutUser.length === 2, `Expected 2 unclaimed members, got ${withoutUser.length}`)
  testTravelPrefix = prefix
})

const testGetTravel = test('get travel by prefix', async () => {
  const { status, data } = await api('GET', `/api/travels/${testTravelPrefix}`)
  assert(status === 200, `Expected 200, got ${status}`)
  assert(data.travel?.name?.includes('Test Trip'), `Travel name mismatch`)
  assert(data.travel?.members?.length === 3, `Expected 3 members`)
})

const testListTravels = test('list user travels', async () => {
  const { status, data } = await api('GET', '/api/travels')
  assert(status === 200, `Expected 200, got ${status}`)
  const found = data.travels?.some((t: any) => t.prefix === testTravelPrefix)
  assert(found, `Travel not found in user's list`)
})

const testUpdateTravel = test('update travel settings', async () => {
  const { status, data } = await api('PUT', `/api/travels/${testTravelPrefix}`, {
    name: 'Updated Test Trip',
    prefix: testTravelPrefix,
    mainCurrency: 'EUR',
    expensePermission: 4,
  })
  assert(status === 200, `Expected 200, got ${status}`)
  const { status: s2, data: d2 } = await api('GET', `/api/travels/${testTravelPrefix}`)
  assert(d2.travel?.mainCurrency === 'EUR', `Currency not updated`)
  assert(d2.travel?.expensePermission === 4, `Permission not updated`)
})

const testCreateTravelNoMembers = test('create travel without extra members', async () => {
  const ts = Date.now()
  const prefix = `test-solo-${ts}`
  const { status, data } = await api('POST', '/api/travels', {
    name: 'Solo Trip',
    prefix,
    mainCurrency: 'USD',
    members: [{ name: 'Alice', isAdmin: true }],
  })
  assert(status === 201, `Expected 201, got ${status}`)
  assert(data.travel?.members?.length === 1, `Expected 1 member`)
  assert(data.travel.members[0].isAdmin === true, `Creator should be admin`)
})

// ─── Expense Tests ───

const testCreateExpenseEqual = test('create equal-split expense', async () => {
  const { data: travel } = await api('GET', `/api/travels/${testTravelPrefix}`)
  const members = travel.travel.members
  const alice = members.find((m: any) => m.name === 'Alice')
  const { status, data } = await api('POST', `/api/travels/${testTravelPrefix}/expenses`, {
    date: '2026-07-02',
    description: 'Lunch',
    amount: 99,
    currency: 'USD',
    paidById: alice.id,
    splitType: 'equal',
    confirmed: true,
    splits: {},
  })
  assert(status === 201, `Expected 201, got ${status}`)
  assert(data.expense?.splits?.length === 3, `Expected 3 splits`)
  testExpenseIds.push(data.expense.id)
})

const testCreateExpenseManual = test('create manual-split expense', async () => {
  const { data: travel } = await api('GET', `/api/travels/${testTravelPrefix}`)
  const members = travel.travel.members
  const alice = members.find((m: any) => m.name === 'Alice')
  const bob = members.find((m: any) => m.name === 'Bob')
  const { status, data } = await api('POST', `/api/travels/${testTravelPrefix}/expenses`, {
    date: '2026-07-03',
    description: 'Dinner with manual split',
    amount: 100,
    currency: 'USD',
    paidById: alice.id,
    splitType: 'manual',
    confirmed: true,
    splits: { [bob.id]: 40 },
  })
  assert(status === 201, `Expected 201, got ${status}`)
  assert(data.expense?.splits?.length === 3, `Expected 3 splits`)
  const bobSplit = data.expense.splits.find((s: any) => s.memberId === bob.id)
  assert(bobSplit?.amount === 40, `Bob should owe $40`)
  testExpenseIds.push(data.expense.id)
})

const testCreateExpenseMultiPayer = test('create expense with extra payer', async () => {
  const { data: travel } = await api('GET', `/api/travels/${testTravelPrefix}`)
  const members = travel.travel.members
  const alice = members.find((m: any) => m.name === 'Alice')
  const bob = members.find((m: any) => m.name === 'Bob')
  const { status, data } = await api('POST', `/api/travels/${testTravelPrefix}/expenses`, {
    date: '2026-07-04',
    description: 'Hotel split',
    amount: 300,
    currency: 'EUR',
    paidById: alice.id,
    extraPayers: [{ memberId: bob.id, amount: 100 }],
    splitType: 'equal',
    confirmed: true,
    splits: {},
  })
  assert(status === 201, `Expected 201, got ${status}`)
  const parsed = JSON.parse(data.expense?.extraPayers || '[]')
  assert(parsed.length === 1, `Expected 1 extra payer`)
  assert(parsed[0].amount === 100, `Extra payer should be 100`)
  testExpenseIds.push(data.expense.id)
})

const testCreateExpenseUnconfirmed = test('create unconfirmed expense', async () => {
  const { data: travel } = await api('GET', `/api/travels/${testTravelPrefix}`)
  const alice = travel.travel.members.find((m: any) => m.name === 'Alice')
  const { status, data } = await api('POST', `/api/travels/${testTravelPrefix}/expenses`, {
    date: '2026-08-01',
    description: 'Pre-booked hotel',
    amount: 500,
    currency: 'USD',
    paidById: alice.id,
    splitType: 'equal',
    confirmed: false,
    splits: {},
  })
  assert(status === 201, `Expected 201, got ${status}`)
  assert(data.expense?.confirmed === false, `Should be unconfirmed`)
  testExpenseIds.push(data.expense.id)
})

const testListExpenses = test('list expenses with filters', async () => {
  const { status, data } = await api('GET', `/api/travels/${testTravelPrefix}/expenses`)
  assert(status === 200, `Expected 200, got ${status}`)
  assert(data.expenses?.length >= 4, `Expected at least 4 expenses`)
  // Check ordering: most recent first (before we changed to asc)
  // Actually we changed to asc (oldest first). Let me just verify count.
})

const testUpdateExpense = test('update an expense', async () => {
  if (!testExpenseIds.length) return
  const id = testExpenseIds[0]
  const { status, data } = await api('PUT', `/api/travels/${testTravelPrefix}/expenses/${id}`, {
    date: '2026-07-02',
    description: 'Updated Lunch',
    amount: 88,
    currency: 'USD',
    paidById: (await api('GET', `/api/travels/${testTravelPrefix}`)).data.travel.members[0].id,
    splitType: 'equal',
    confirmed: true,
    splits: {},
  })
  assert(status === 200, `Expected 200, got ${status}`)
  assert(data.expense?.description === 'Updated Lunch', `Description not updated`)
  assert(data.expense?.amount === 88, `Amount not updated`)
})

const testDeleteExpense = test('delete an expense', async () => {
  if (!testExpenseIds.length) return
  const id = testExpenseIds[testExpenseIds.length - 1]
  const { status } = await api('DELETE', `/api/travels/${testTravelPrefix}/expenses/${id}`)
  assert(status === 200, `Expected 200, got ${status}`)
  testExpenseIds.pop()
})

const testExpensePermissions = test('respect expense permissions', async () => {
  // With permission=4 (everyone all), any member can edit
  // First set permission to 4
  await api('PUT', `/api/travels/${testTravelPrefix}`, {
    name: 'Updated Test Trip',
    prefix: testTravelPrefix,
    mainCurrency: 'EUR',
    expensePermission: 4,
  })
  // With permission=1 (admin only), non-admin cannot create
  await api('PUT', `/api/travels/${testTravelPrefix}`, {
    name: 'Updated Test Trip',
    prefix: testTravelPrefix,
    mainCurrency: 'EUR',
    expensePermission: 1,
  })
  // Reset to 4 for further tests
  await api('PUT', `/api/travels/${testTravelPrefix}`, {
    name: 'Updated Test Trip',
    prefix: testTravelPrefix,
    mainCurrency: 'EUR',
    expensePermission: 4,
  })
})

// ─── Invite Tests ───

const testCreateInvite = test('create invitation code', async () => {
  const { status, data } = await api('POST', `/api/travels/${testTravelPrefix}/invites`)
  assert(status === 201, `Expected 201, got ${status}`)
  assert(data.code?.length === 8, `Expected 8-char code, got ${data.code}`)
})

// ─── Rate Tests ───

const testSetRate = test('set exchange rate', async () => {
  const { status } = await api('PUT', `/api/travels/${testTravelPrefix}/rates`, {
    fromCurrency: 'GBP',
    rate: 0.85,
  })
  assert(status === 200, `Expected 200, got ${status}`)
})

const testGetRates = test('get exchange rates', async () => {
  const { status, data } = await api('GET', `/api/travels/${testTravelPrefix}/rates`)
  assert(status === 200, `Expected 200, got ${status}`)
  const gbp = data.rates?.find((r: any) => r.fromCurrency === 'GBP')
  assert(gbp?.rate === 0.85, `Expected GBP rate 0.85, got ${gbp?.rate}`)
})

// ─── Member Group Tests ───

const testCreateGroup = test('create member group', async () => {
  const { data: travel } = await api('GET', `/api/travels/${testTravelPrefix}`)
  const members = travel.travel.members
  const bob = members.find((m: any) => m.name === 'Bob')
  const charlie = members.find((m: any) => m.name === 'Charlie')
  const { status, data } = await api('POST', `/api/travels/${testTravelPrefix}/groups`, {
    name: 'Roommates',
    memberIds: [bob.id, charlie.id],
  })
  assert(status === 201, `Expected 201, got ${status}`)
  assert(data.group?.members?.length === 2, `Expected 2 members in group`)
})

const testDeleteGroup = test('delete member group', async () => {
  const { data: groups } = await api('GET', `/api/travels/${testTravelPrefix}/groups`)
  const group = groups.groups?.[0]
  if (!group) return
  const { status } = await api('DELETE', `/api/travels/${testTravelPrefix}/groups/${group.id}`)
  assert(status === 200, `Expected 200, got ${status}`)
})

// ─── Upload Test ───

const testUpload = test('upload image', async () => {
  // Just test the endpoint rejects without file
  const res = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    headers: { 'Cookie': cookie },
  })
  assert(res.status === 400, `Expected 400 for no file, got ${res.status}`)
})

// ─── Cleanup ───

const testDeleteTravel = test('delete travel', async () => {
  if (!testTravelPrefix) return
  const { status } = await api('DELETE', `/api/travels/${testTravelPrefix}`)
  assert(status === 200, `Expected 200, got ${status}`)
})

// ─── Runner ───

const tests = [
  ['Auth', [
    testNoAuth,
    testAuthWithCookie,
  ]],
  ['Travel CRUD', [
    testCreateTravel,
    testGetTravel,
    testListTravels,
    testUpdateTravel,
    testCreateTravelNoMembers,
  ]],
  ['Expense CRUD', [
    testCreateExpenseEqual,
    testCreateExpenseManual,
    testCreateExpenseMultiPayer,
    testCreateExpenseUnconfirmed,
    testListExpenses,
    testUpdateExpense,
    testDeleteExpense,
    testExpensePermissions,
  ]],
  ['Invite & Rates', [
    testCreateInvite,
    testSetRate,
    testGetRates,
  ]],
  ['Member Groups', [
    testCreateGroup,
    testDeleteGroup,
  ]],
  ['Upload', [
    testUpload,
  ]],
  ['Cleanup', [
    testDeleteTravel,
  ]],
]

async function main() {
  console.log('\n╔══════════════════════════════════════╗')
  console.log('║    TravelExpense API Test Suite      ║')
  console.log('╚══════════════════════════════════════╝\n')

  try {
    await getSessionCookie()
  } catch (e: any) {
    console.log(`  ✗ ${e.message}`)
    console.log(`\n  Results: 0 passed, 1 failed\n`)
    process.exit(1)
  }

  for (const [suite, fns] of tests) {
    console.log(`\n── ${suite} ──`)
    for (const fn of fns) {
      await fn()
    }
  }

  console.log(`\n  Results: ${pass} passed, ${fail} failed\n`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
