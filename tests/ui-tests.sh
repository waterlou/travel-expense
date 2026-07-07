#!/bin/bash
# TravelExpense UI Test Suite — CDP
# Prerequisites: app on :3333, Chrome Canary logged in, session connected

PASS=0; FAIL=0

assert() {
  if [ "$1" = "$2" ]; then echo "  ✓ $3"; PASS=$((PASS+1))
  else echo "  ✗ $3: expected '$2', got '$1'"; FAIL=$((FAIL+1)); fi
}

run() {
  local result
  result=$(browser-harness-js "$1" 2>/dev/null || echo "ERROR")
  assert "$result" "$2" "$3"
}

nav() {
  browser-harness-js "const tabs = await listPageTargets(); const tab = tabs.find(t => t.url && t.url.includes('localhost:3333')); if (!tab) return 'NO_TAB'; await session.use(tab.targetId); await session.Page.navigate({ url: '${BASE}$1' }); await new Promise(r => setTimeout(r, 1500)); return 'OK'" > /dev/null 2>&1
}

eval_page() {
  browser-harness-js "const tabs = await listPageTargets(); const tab = tabs.find(t => t.url && t.url.includes('localhost:3333')); if (!tab) return 'NO_TAB'; await session.use(tab.targetId); const r = await session.Runtime.evaluate({ expression: $1, returnByValue: true }); return r.result.value" 2>/dev/null || echo "ERROR"
}

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   TravelExpense UI Test Suite        ║"
echo "╚══════════════════════════════════════╝"
echo ""

BASE="http://localhost:3333"
PREFIX="test-ui-$$"

# Reset locale and theme
browser-harness-js "
const tabs = await listPageTargets();
const tab = tabs.find(t => t.url && t.url.includes('localhost:3333'));
if (!tab) return 'NO_TAB';
await session.use(tab.targetId);
await session.Runtime.evaluate({ expression: 'localStorage.setItem(\"locale\", \"en\"); localStorage.setItem(\"theme-mode\", \"light\")' });
await session.Page.reload();
await new Promise(r => setTimeout(r, 1500));
return 'RESET'
" 2>/dev/null > /dev/null

# ─── Home Page ───
echo "── Home Page ──"
nav "/"
ASSERT_TITLE=$(eval_page "'document.title'")
assert "$ASSERT_TITLE" "TravelExpense" "page title is TravelExpense"

HAS_SIGN_OUT=$(eval_page "'document.body.innerText.includes(\"Sign Out\") ? \"YES\" : \"NO\"'")
assert "$HAS_SIGN_OUT" "YES" "sign out button visible"

HAS_NEW_TRAVEL=$(eval_page "'document.body.innerText.includes(\"New Travel\") ? \"YES\" : \"NO\"'")
assert "$HAS_NEW_TRAVEL" "YES" "new travel button visible"

# ─── Create travel via API for UI testing ───
echo ""
echo "── Create Test Travel ──"
browser-harness-js "
const tabs = await listPageTargets();
const tab = tabs.find(t => t.url && t.url.includes('localhost:3333'));
if (!tab) return 'NO_TAB';
await session.use(tab.targetId);
const r = await session.Runtime.evaluate({
  expression: \`(async () => {
    const res = await fetch('/api/travels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'UI Test Trip',
        prefix: '${PREFIX}',
        mainCurrency: 'USD',
        currencies: ['EUR'],
        startDate: '2026-07-01',
        endDate: '2026-07-10',
        expensePermission: 4,
        members: [
          { name: 'Tester', isAdmin: true },
          { name: 'Friend', isAdmin: false }
        ]
      })
    });
    const data = await res.json();
    return res.status + ':' + data.travel?.prefix;
  })()\`,
  returnByValue: true,
  awaitPromise: true,
});
return r.result.value" 2>/dev/null

# Also create an expense
browser-harness-js "
const tabs = await listPageTargets();
const tab = tabs.find(t => t.url && t.url.includes('localhost:3333'));
if (!tab) return 'NO_TAB';
await session.use(tab.targetId);
const r = await session.Runtime.evaluate({
  expression: \`(async () => {
    const t = await (await fetch('/api/travels/${PREFIX}')).json();
    const m = t.travel.members.find(x => x.name === 'Tester');
    await fetch('/api/travels/${PREFIX}/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-07-05',
        description: 'Test Dinner',
        amount: 60,
        currency: 'USD',
        paidById: m.id,
        splitType: 'equal',
        confirmed: true,
        splits: {}
      })
    });
    return 'CREATED';
  })()\`,
  returnByValue: true,
  awaitPromise: true,
});
return r.result.value" 2>/dev/null

# ─── Navigate to dashboard ───
echo ""
echo "── Dashboard Page ──"
nav "/${PREFIX}"
HAS_TITLE=$(eval_page "'document.body.innerText.includes(\"UI Test Trip\") ? \"YES\" : \"NO\"'")
assert "$HAS_TITLE" "YES" "dashboard shows travel name"

HAS_STATS=$(eval_page "'document.body.innerText.includes(\"Total Expenses\") ? \"YES\" : \"NO\"'")
assert "$HAS_STATS" "YES" "dashboard shows stats cards"

# ─── Expenses Page ───
echo ""
echo "── Expenses Page ──"
nav "/${PREFIX}/expenses"
HAS_ADD=$(eval_page "'document.body.innerText.includes(\"Add Expense\") ? \"YES\" : \"NO\"'")
assert "$HAS_ADD" "YES" "add expense button visible"

HAS_GROUPED=$(eval_page "'document.body.innerText.includes(\"2026\") ? \"YES\" : \"NO\"'")
assert "$HAS_GROUPED" "YES" "expenses grouped by date"

# ─── New Expense Page ───
echo ""
echo "── New Expense Page ──"
nav "/${PREFIX}/expenses/new"
HAS_CALC=$(eval_page "'document.body.innerText.includes(\"Amount\") ? \"YES\" : \"NO\"'")
assert "$HAS_CALC" "YES" "amount field visible"

HAS_PAID_BY=$(eval_page "'document.body.innerText.includes(\"Paid By\") ? \"YES\" : \"NO\"'")
assert "$HAS_PAID_BY" "YES" "paid by dropdown visible"

HAS_SPLIT_AMONG=$(eval_page "'document.body.innerText.includes(\"Split among\") ? \"YES\" : \"NO\"'")
assert "$HAS_SPLIT_AMONG" "YES" "split among chips visible"

# ─── Members Page ───
echo ""
echo "── Members Page ──"
nav "/${PREFIX}/members"
HAS_MEMBERS=$(eval_page "'document.body.innerText.includes(\"Tester\") ? \"YES\" : \"NO\"'")
assert "$HAS_MEMBERS" "YES" "members list shows Tester"

HAS_FRIEND=$(eval_page "'document.body.innerText.includes(\"Friend\") ? \"YES\" : \"NO\"'")
assert "$HAS_FRIEND" "YES" "members list shows Friend"

HAS_GROUPS=$(eval_page "'document.body.innerText.includes(\"Groups\") ? \"YES\" : \"NO\"'")
assert "$HAS_GROUPS" "YES" "groups section visible"

# ─── Balance Page ───
echo ""
echo "── Balance Page ──"
nav "/${PREFIX}/balance"
HAS_PER_CURRENCY=$(eval_page "'document.body.innerText.includes(\"Per Currency\") ? \"YES\" : \"NO\"'")
assert "$HAS_PER_CURRENCY" "YES" "per currency table visible"

HAS_CONVERTED=$(eval_page "'document.body.innerText.includes(\"Converted Balance\") ? \"YES\" : \"NO\"'")
assert "$HAS_CONVERTED" "YES" "converted balance table visible"

HAS_PDF=$(eval_page "'document.body.innerText.includes(\"Export PDF\") ? \"YES\" : \"NO\"'")
assert "$HAS_PDF" "YES" "export PDF button visible"

# ─── Settings Page ───
echo ""
echo "── Settings Page ──"
nav "/${PREFIX}/settings"
SHOWS_SETTINGS=$(eval_page "'document.body.innerText.includes(\"Travel Details\") ? \"YES\" : \"NO\"'")
assert "$SHOWS_SETTINGS" "YES" "settings shows travel details"

# ─── Theme Toggle ───
echo ""
echo "── Theme Toggle ──"

# Reset to light mode via localStorage
browser-harness-js "
const tabs = await listPageTargets();
const tab = tabs.find(t => t.url && t.url.includes('localhost:3333'));
if (!tab) return 'NO_TAB';
await session.use(tab.targetId);
await session.Runtime.evaluate({ expression: 'localStorage.setItem(\"theme-mode\", \"light\")' });
await session.Page.reload();
await new Promise(r => setTimeout(r, 1000));
return 'RESET'
" 2>/dev/null > /dev/null

nav "/${PREFIX}"
BG_BEFORE=$(eval_page "'getComputedStyle(document.body).backgroundColor'")
assert "$BG_BEFORE" "rgb(255, 248, 240)" "light mode background"

# Toggle to dark via localStorage
browser-harness-js "
const tabs = await listPageTargets();
const tab = tabs.find(t => t.url && t.url.includes('localhost:3333'));
if (!tab) return 'NO_TAB';
await session.use(tab.targetId);
await session.Runtime.evaluate({ expression: 'localStorage.setItem(\"theme-mode\", \"dark\")' });
await session.Page.reload();
await new Promise(r => setTimeout(r, 1000));
return 'DARK'
" 2>/dev/null > /dev/null

BG_AFTER=$(eval_page "'getComputedStyle(document.body).backgroundColor'")
assert "$BG_AFTER" "rgb(13, 17, 23)" "dark mode background changed"

# Toggle back to light
browser-harness-js "
const tabs = await listPageTargets();
const tab = tabs.find(t => t.url && t.url.includes('localhost:3333'));
if (!tab) return 'NO_TAB';
await session.use(tab.targetId);
await session.Runtime.evaluate({ expression: 'localStorage.setItem(\"theme-mode\", \"light\")' });
await session.Page.reload();
await new Promise(r => setTimeout(r, 1000));
return 'LIGHT'
" 2>/dev/null > /dev/null

# ─── Results ───
echo ""
echo "═══════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════"

# Cleanup
COOKIE=$(browser-harness-js 'const cookies = await session.Network.getCookies({ urls: ["http://localhost:3333"] }); return cookies.cookies.map(c => c.name + "=" + c.value)[0]' 2>/dev/null)
[ -n "$COOKIE" ] && curl -s -X DELETE "http://localhost:3333/api/travels/${PREFIX}" -H "Cookie: $COOKIE" > /dev/null 2>&1 || true

# Reset theme to light
browser-harness-js "
const tabs = await listPageTargets();
const tab = tabs.find(t => t.url && t.url.includes('localhost:3333'));
if (!tab) return 'NO_TAB';
await session.use(tab.targetId);
await session.Runtime.evaluate({ expression: 'localStorage.setItem(\"theme-mode\", \"light\")' });
return 'RESET'
" 2>/dev/null > /dev/null

[ "$FAIL" -gt 0 ] && exit 1 || exit 0
