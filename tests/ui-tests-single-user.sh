#!/bin/bash
# TravelExpense UI Test Suite — Single-User Mode
#
# Verifies the single-user experience end to end in a real browser:
#   - no login anywhere (landing shows travels immediately, auth pages redirect home)
#   - exactly one implicit Admin who owns every travel
#   - no members/invites/groups UI (nav, dashboard card, dialog/settings controls)
#   - expense add → edit → delete round trip
#   - the travel-create dialog maps its permission choice to the API field
#
# Prerequisites:
#   - browser-harness installed and connected to a Chrome with remote debugging
#     allowed (chrome://inspect/#remote-debugging; click "Allow" on the popup)
#   - Node deps installed
#
# The app itself is auto-started on :3333 with NEXT_PUBLIC_SINGLE_USER_MODE=true
# if nothing is already listening there. If a server is already running, it must
# have been built/started with the flag ON (it is inlined at compile time) — the
# script probes the mode and fails fast with a hint otherwise.
#
# NOTE: when the script auto-starts the server it clears .next/ so the flag is
# compiled in fresh.

BASE="http://localhost:3333"
PASS=0; FAIL=0
STARTED_SERVER=0
DEV_LOG="/tmp/sui-ui-test-dev.log"

if command -v browser-harness >/dev/null 2>&1; then
  BH="browser-harness"
else
  BH="$HOME/.agents/skills/browser-harness/browser-harness"
fi

assert() {
  if [ "$1" = "$2" ]; then echo "  ✓ $3"; PASS=$((PASS+1))
  else echo "  ✗ $3: expected '$2', got '$1'"; FAIL=$((FAIL+1)); fi
}

# ── browser helpers (each runs one Python snippet against the harness) ──

# Evaluate a JS expression in the current tab; prints the result.
eval_js() {
  BH_JS="$1" "$BH" <<'PY' 2>/dev/null
import os
print(js(os.environ['BH_JS']))
PY
}

# Navigate to $BASE$1. First call opens a new tab, later calls reuse it.
nav() {
  if [ "${NAV_COUNT:-0}" = "0" ]; then
    BH_URL="${BASE}$1" "$BH" <<'PY' > /dev/null 2>&1
import os
new_tab(os.environ['BH_URL'])
wait_for_load()
PY
    NAV_COUNT=1
  else
    BH_URL="${BASE}$1" "$BH" <<'PY' > /dev/null 2>&1
import os
goto_url(os.environ['BH_URL'])
wait_for_load()
PY
  fi
  sleep 1
}

# Poll until location.pathname equals $1 (client-side redirects), max $2 seconds.
wait_path() {
  BH_EXPECT="$1" BH_TIMEOUT="$2" "$BH" <<'PY' 2>/dev/null
import os, time
expect = os.environ['BH_EXPECT']
deadline = time.time() + int(os.environ['BH_TIMEOUT'])
last = ''
while time.time() < deadline:
    last = js('location.pathname')
    if last == expect:
        print('YES')
        break
    time.sleep(0.3)
else:
    print('NO:' + str(last))
PY
}

# Poll until location.pathname matches regex $1 (client-side redirects), max $2 seconds.
wait_path_re() {
  BH_EXPECT="$1" BH_TIMEOUT="$2" "$BH" <<'PY' 2>/dev/null
import os, re, time
expect = os.environ['BH_EXPECT']
deadline = time.time() + int(os.environ['BH_TIMEOUT'])
last = ''
while time.time() < deadline:
    last = js('location.pathname')
    if re.match(expect, last):
        print('YES')
        break
    time.sleep(0.3)
else:
    print('NO:' + str(last))
PY
}

# Click a <button> whose trimmed innerText equals $1.
click_button() {
  BH_LABEL="$1" "$BH" <<'PY' 2>/dev/null
import os, json
label = os.environ['BH_LABEL']
code = ("(() => { const btns=[...document.querySelectorAll('button')]; "
        f"const b=btns.find(x => x.innerText.trim()==={json.dumps(label)}); "
        "if (!b) return 'NOT_FOUND'; b.click(); return 'OK'; })()")
print(js(code))
PY
}

# Set a React-controlled input/textarea value. Uses the harness's native helper
# (focus + typing) and then force-overwrites the value via the native setter so
# the result is deterministic even if select-all misfires. timeout waits for
# late-rendered elements (forms behind data fetches).
fill_input() {
  BH_SEL="$1" BH_VAL="$2" "$BH" <<'PY' 2>/dev/null
import os, json
sel, val = os.environ['BH_SEL'], os.environ['BH_VAL']
r = fill_input(sel, val, timeout=10)
force = f"""(() => {{
  const el = document.querySelector({json.dumps(sel)});
  if (!el) return false;
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, {json.dumps(val)});
  el.dispatchEvent(new Event('input', {{ bubbles: true }}));
  el.dispatchEvent(new Event('change', {{ bubbles: true }}));
  return true;
}})()"""
js(force)
print('OK' if r is not False else 'FAIL')
PY
}

# Poll until the page body contains $1 (data fetches settle), max $2 seconds.
wait_text() {
  BH_NEEDLE="$1" BH_TIMEOUT="$2" "$BH" <<'PY' 2>/dev/null
import os, time
needle = os.environ['BH_NEEDLE']
deadline = time.time() + int(os.environ['BH_TIMEOUT'])
last = 'NO'
while time.time() < deadline:
    body = js('document.body ? document.body.innerText : ""')
    if needle in body:
        print('YES')
        break
    last = 'NO'
    time.sleep(0.4)
else:
    print(last)
PY
}

# YES if the page body (or $2 selector's subtree) contains $1, else NO.
has_text() {
  if [ -n "${2:-}" ]; then
    BH_NEEDLE="$1" BH_SCOPE="$2" "$BH" <<'PY' 2>/dev/null
import os
needle, scope = os.environ['BH_NEEDLE'], os.environ['BH_SCOPE']
print(js(f"(() => {{ const el = document.querySelector({scope!r}); const t = el ? el.innerText : ''; return t.includes({needle!r}) ? 'YES' : 'NO'; }})()"))
PY
  else
    BH_NEEDLE="$1" "$BH" <<'PY' 2>/dev/null
import os
print(js("document.body ? document.body.innerText.includes(" + repr(os.environ['BH_NEEDLE']) + ") ? 'YES' : 'NO' : 'NO'"))
PY
  fi
}

cleanup() {
  [ -n "${PREFIX_API:-}" ] && curl -s -X DELETE "$BASE/api/travels/$PREFIX_API" > /dev/null 2>&1
  [ -n "${PREFIX_DLG:-}" ] && curl -s -X DELETE "$BASE/api/travels/$PREFIX_DLG" > /dev/null 2>&1
  BH_JS="localStorage.setItem('theme-mode','light'); localStorage.setItem('locale','en')" "$BH" <<'PY' > /dev/null 2>&1
import os
js(os.environ['BH_JS'])
PY
  if [ "$STARTED_SERVER" = "1" ]; then
    kill "$DEV_PID" 2>/dev/null
    wait "$DEV_PID" 2>/dev/null
  fi
}
trap cleanup EXIT

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  TravelExpense UI Test Suite — Single-User   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Prerequisites ──
echo "── Prerequisites ──"

# App must be up and in single-user mode (poll past the cold-compile of /api/travels)
MODE_BODY=""
CODE=""
for _ in $(seq 1 60); do
  MODE_BODY=$(curl -s -m 5 "$BASE/api/travels" 2>/dev/null)
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 5 "$BASE/api/travels" 2>/dev/null)
  case "$MODE_BODY" in
    *"\"travels\""*) break ;;
  esac
  [ "$CODE" = "000" ] && sleep 1
done
if [ "$CODE" = "000" ]; then
  echo "  No server on :3333 — starting dev server with the single-user flag..."
  rm -rf .next   # flag is inlined at compile time; avoid stale bundles
  PORT=3333 NEXT_PUBLIC_SINGLE_USER_MODE=true npm run dev > "$DEV_LOG" 2>&1 &
  DEV_PID=$!
  STARTED_SERVER=1
  for _ in $(seq 1 90); do
    MODE_BODY=$(curl -s -m 5 "$BASE/api/travels" 2>/dev/null)
    case "$MODE_BODY" in
      *"\"travels\""*) CODE=200; break ;;
    esac
    sleep 1
  done
  if [ "$CODE" != "200" ]; then
    echo "  ✗ dev server failed to start (last log lines below); run the script again after fixing"
    tail -5 "$DEV_LOG"
    exit 1
  fi
  echo "  ✓ dev server ready on :3333"
fi

case "$MODE_BODY" in
  *"\"travels\""*) echo "  ✓ single-user mode active" ;;
  *"Unauthorized"*) echo "  ✗ app is running in MULTI-USER mode — start it with NEXT_PUBLIC_SINGLE_USER_MODE=true (and a fresh compile)"; exit 1 ;;
  *) echo "  ✗ unexpected response from $BASE/api/travels (HTTP $CODE): ${MODE_BODY:0:80}"; exit 1 ;;
esac

# Browser harness must be connected
HARNESS_OK=$(eval_js '1+1' | tail -1)
if [ "$HARNESS_OK" != "2" ]; then
  echo "  ✗ browser harness not connected — enable chrome://inspect/#remote-debugging and click Allow, then rerun"
  exit 1
fi
echo "  ✓ browser harness connected"

# Reset locale/theme for stable text assertions
eval_js "localStorage.setItem('locale','en'); localStorage.setItem('theme-mode','light')" > /dev/null

# ─── Home Page (no login) ───
echo ""
echo "── Home Page ──"
nav "/"
assert "$(eval_js 'document.title')" "TravelExpense" "page title is TravelExpense"
assert "$(has_text 'Sign in with Google')" "NO" "no Google sign-in button"
assert "$(has_text 'Join')" "NO" "no Join button"
assert "$(has_text 'Your Travels')" "YES" "travels heading visible"
assert "$(has_text 'New Travel')" "YES" "new travel button visible"
assert "$(eval_js "document.querySelector('.MuiAppBar-root .MuiAvatar-root')?.textContent || ''")" "A" "header shows Admin avatar 'A'"

# ─── Create-travel dialog hides multi-user controls ───
echo ""
echo "── Create Travel Dialog ──"
assert "$(click_button 'New Travel')" "OK" "open create dialog"
sleep 1
assert "$(has_text 'Travel Name' '.MuiDialog-root')" "YES" "dialog shows travel name"
assert "$(has_text 'Expense Permission' '.MuiDialog-root')" "NO" "no permission selector"
assert "$(has_text 'Travel Members' '.MuiDialog-root')" "NO" "no member editor"
assert "$(has_text 'Allow invited users' '.MuiDialog-root')" "NO" "no allow-member switch"

# Create via the dialog: permission choice must reach the API (expensePermission)
DLG_NAME="SUI Dialog $$"
assert "$(fill_input '.MuiDialog-root input' "$DLG_NAME")" "OK" "fill travel name"
assert "$(click_button 'Create Travel')" "OK" "submit dialog"
assert "$(wait_path_re '^/sui-dialog-' 10)" "YES" "dialog-created travel navigated to its page"
PREFIX_DLG=$(eval_js 'location.pathname' | sed 's|^/||; s|/.*$||')
assert "$(wait_text 'Total Expenses' 10)" "YES" "travel shell rendered"
DLG_PERM=$(curl -s "$BASE/api/travels/$PREFIX_DLG" | python3 -c 'import json,sys; print(json.load(sys.stdin)["travel"]["expensePermission"])' 2>/dev/null)
assert "$DLG_PERM" "3" "dialog permission choice (3) reaches the API"
curl -s -X DELETE "$BASE/api/travels/$PREFIX_DLG" > /dev/null
echo "  (cleaned up dialog travel)"

# ─── API travel: fixed Admin identity ───
echo ""
echo "── Single Admin Identity ──"
CREATE_CODE=$(curl -s -o /tmp/sui-create.json -w '%{http_code}' -X POST "$BASE/api/travels" \
  -H 'Content-Type: application/json' -d "{\"name\":\"SUI API $$\"}")
assert "$CREATE_CODE" "201" "create travel via API"
PREFIX_API=$(python3 -c 'import json; print(json.load(open("/tmp/sui-create.json"))["travel"]["prefix"])')
MEMBER_INFO=$(curl -s "$BASE/api/travels/$PREFIX_API" | python3 -c "
import json, sys
t = json.load(sys.stdin)['travel']
m = t['members'][0]
print(str(len(t['members'])) + '|' + m['name'] + '|' + str(m['isAdmin']) + '|' + m['userId'])")
assert "$MEMBER_INFO" "1|Admin|True|single-user" "travel has exactly one member: Admin, admin, single-user"

# ─── Travel shell / dashboard ───
echo ""
echo "── Dashboard ──"
nav "/$PREFIX_API"
assert "$(has_text 'SUI API')" "YES" "dashboard shows travel name"
assert "$(has_text 'Total Expenses')" "YES" "total expenses stat"
assert "$(has_text 'Members')" "NO" "no Members stat card"
for label in Dashboard Expenses Balance Settings; do
  assert "$(has_text "$label")" "YES" "nav has $label"
done

# ─── Auth pages dead ───
echo ""
echo "── Auth Pages Dead ──"
for p in login register "invite?code=ZZZ"; do
  nav "/$p"
  assert "$(eval_js 'location.pathname')" "/" "GET /$p redirects to /"
done

# ─── Members page redirects ──
echo ""
echo "── Members Page ──"
nav "/$PREFIX_API/members"
assert "$(wait_path "/$PREFIX_API" 8)" "YES" "/members redirects to travel root"

# ─── New Expense Page: no multi-user pickers ──
echo ""
echo "── New Expense Page ──"
nav "/$PREFIX_API/expenses/new"
assert "$(has_text 'Amount')" "YES" "amount field visible"
assert "$(has_text 'Save Expense')" "YES" "save button visible"
assert "$(has_text 'Paid By')" "NO" "no payer selector"
assert "$(has_text 'Split among')" "NO" "no split-among chips"
assert "$(has_text 'Add co-payer')" "NO" "no co-payer button"
assert "$(has_text 'Split Type')" "NO" "no split-type selector"

# ─── Add Expense ──
echo ""
echo "── Add Expense ──"
assert "$(fill_input 'input[type=text]' 'Dinner')" "OK" "fill description"
assert "$(fill_input 'input[type=number]' '12.50')" "OK" "fill amount"
assert "$(click_button 'Save Expense')" "OK" "save expense"
assert "$(wait_path "/$PREFIX_API/expenses" 8)" "YES" "returns to expenses list"
assert "$(wait_text 'Dinner' 8)" "YES" "expense listed"
assert "$(has_text 'Admin paid')" "YES" "payer is Admin"

# ─── Edit Expense ──
echo ""
echo "── Edit Expense ──"
assert "$(eval_js "(() => { const li=document.querySelector('main .MuiListItem-root'); const b=li?.querySelectorAll('button')[0]; if(!b) return 'NOT_FOUND'; b.click(); return 'OK'; })()")" "OK" "open edit page"
assert "$(wait_path_re "^/$PREFIX_API/expenses/[^/]+$" 8)" "YES" "navigated to expense detail"
assert "$(wait_text 'Update Expense' 10)" "YES" "edit form loaded"
assert "$(has_text 'Paid By')" "NO" "edit page: no payer selector"
assert "$(has_text 'Split among')" "NO" "edit page: no split-among chips"
assert "$(fill_input 'input[type=number]' '15')" "OK" "change amount to 15"
assert "$(click_button 'Update Expense')" "OK" "save edit"
assert "$(wait_path "/$PREFIX_API/expenses" 8)" "YES" "back on expenses list"
assert "$(wait_text '15.00' 8)" "YES" "updated amount shown"

# ─── Delete Expense ──
echo ""
echo "── Delete Expense ──"
assert "$(eval_js "(() => { const li=document.querySelector('main .MuiListItem-root'); const b=li?.querySelectorAll('button')[1]; if(!b) return 'NOT_FOUND'; b.click(); return 'OK'; })()")" "OK" "open delete confirm"
sleep 1
assert "$(has_text 'Are you sure you want to delete this expense?' '.MuiDialog-root')" "YES" "confirm dialog visible"
echo "  (dialog shows: $(eval_js "document.querySelector('.MuiDialog-root')?.innerText || ''" | tr '\n' ' '))"
assert "$(click_button 'Delete')" "OK" "confirm delete"
for _ in $(seq 1 20); do
  [ "$(has_text 'No expenses found')" = "YES" ] && break
  sleep 0.5
done
assert "$(has_text 'No expenses found')" "YES" "expense deleted, list empty"

# ─── Settings ──
echo ""
echo "── Settings ──"
nav "/$PREFIX_API/settings"
assert "$(has_text 'Travel Details')" "YES" "settings renders"
assert "$(has_text 'Expense Permission')" "NO" "no permission selector"
assert "$(has_text 'Allow invited users')" "NO" "no allow-member switch"

# ─── Balance ──
echo ""
echo "── Balance ──"
nav "/$PREFIX_API/balance"
assert "$(wait_text 'Per Currency' 8)" "YES" "per-currency table visible"
assert "$(has_text 'Export PDF')" "YES" "export PDF button visible"

# ─── Results ──
echo ""
echo "═══════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════"

[ "$FAIL" -gt 0 ] && exit 1 || exit 0
