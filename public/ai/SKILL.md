---
name: travel-expense-api
description: REST API for the TravelExpense app — list/create/update/delete travels and expenses, manage exchange rates, authenticate with a Bearer API key.
---

# TravelExpense REST API

## Base URL

All paths are relative to the site root including any path prefix; if the app is at `https://host/travel-expense`, call `https://host/travel-expense/api/...`. `GET /api/me` confirms identity and returns `skillsUrl`.

## Auth

Send `Authorization: Bearer te_...` on every request. Each user creates their own key in Settings → API Keys (shown once at creation). The key acts as that user, with exactly the same access rights. No session/login needed. An invalid key → 401 `{ "error": "Unauthorized" }`.

Requests with **no** credentials at all are treated as unauthenticated browser requests: in multi-user mode the middleware redirects them to the sign-in page (HTTP 307, HTML), not a JSON 401. Always send a `Bearer` header to get JSON error responses.

Key creation and revocation are NOT available over the API — they require the web UI (interactive session); an agent authenticated with a key receives 403 `{ "error": "Not allowed with API key" }` on `/api/keys`.

## Endpoints

### 1. `GET /api/me`

Confirms identity and returns the skills guide URL.

```json
{ "user": { "id": "...", "name": "Admin", "email": null }, "skillsUrl": "/ai/SKILL.md" }
```

### 2. `GET /api/travels`

List travels the authenticated user is a member of.

```json
{
  "travels": [
    {
      "id": "...",
      "name": "Trip to Lisbon",
      "prefix": "trip-to-lisbon",
      "startDate": null,
      "endDate": null,
      "mainCurrency": "USD",
      "currencies": "[]",
      "expensePermission": 1,
      "allowMemberCreate": false,
      "createdAt": "...",
      "updatedAt": "...",
      "members": [{ "id": "...", "name": "Admin", "isAdmin": true }],
      "memberCount": 1
    }
  ]
}
```

`currencies` is a JSON-encoded array string; parse it. `expensePermission`: 1 = only admin can add/edit/delete expenses, 2 = everyone can add / only admin edits, 3 = everyone adds, edit/delete own only, 4 = everyone can do everything.

### 3. `POST /api/travels`

Body: `{ "name": string, "mainCurrency"?: string, "currencies"?: string[], "startDate"?: "YYYY-MM-DD", "endDate"?: "YYYY-MM-DD" }` → 201.

```json
{ "travel": { "id": "...", "prefix": "my-trip", "name": "My Trip", "mainCurrency": "USD", "currencies": "[]", "members": [{ "id": "member-id", "name": "Admin", "isAdmin": true }] } }
```

`name` is required. In single-user mode the travel gets exactly one member (the Admin); in multi-user mode the caller is always the first member and is always the admin (pass `isAdmin: true` in the members array only for additional co-admins; other members default to non-admin). `mainCurrency` must be a whitelisted ISO 4217 code; `currencies` an array of such codes (max 10); `startDate`/`endDate` valid `YYYY-MM-DD`; `expensePermission` an integer 1–4 — invalid values → 400. Concurrent creates with the same name are disambiguated automatically (prefix suffixes).

### 4. `GET /api/travels/{idOrPrefix}`

Travel by id or URL-safe prefix. Members are included with their `user` info:

```json
{ "travel": { "id": "...", "name": "...", "prefix": "...", "members": [{ "id": "...", "name": "...", "isAdmin": true, "userId": "...", "user": { "email": "...", "name": "..." } }] } }
```

Not a member → 403 `{ "error": "Not a member" }`; unknown travel → 404.

### 5. `GET /api/travels/{idOrPrefix}/full`

Travel + all expenses + all rates in one round trip — preferred for agent context.

```json
{
  "travel": { "id": "...", "name": "...", "prefix": "...", "members": [{ "id": "...", "name": "Admin", "isAdmin": true, "userId": "single-user", "user": null }] },
  "expenses": [
    {
      "id": "...",
      "travelId": "...",
      "date": "2026-08-06",
      "description": "AI Dinner",
      "amount": 42.5,
      "currency": "USD",
      "paidById": "...",
      "extraPayers": "[]",
      "splitType": "equal",
      "confirmed": true,
      "imageUrl": null,
      "createdAt": "...",
      "updatedAt": "...",
      "paidBy": { "id": "...", "travelId": "...", "userId": "single-user", "name": "Admin", "isAdmin": true, "groupId": null },
      "splits": [{ "id": "...", "expenseId": "...", "memberId": "...", "amount": null, "member": { "id": "...", "travelId": "...", "userId": "single-user", "name": "Admin", "isAdmin": true, "groupId": null } }]
    }
  ],
  "rates": []
}
```

`rates` entries: `{ "id": "...", "travelId": "...", "fromCurrency": "EUR", "toCurrency": "USD", "rate": 1.09, "updatedAt": "..." }`. In an equal split `amount: null` means "computed as total / member count" — compute it yourself.

### 6. `PUT /api/travels/{idOrPrefix}`

Admin only. **Patch semantics**: only fields present in the body are updated; omitted fields keep their current values. Body fields (all optional): `name`, `startDate`, `endDate`, `mainCurrency`, `currencies` (string[]), `expensePermission` (1–4), `allowMemberCreate` (boolean). The `prefix` is never changed by an update — renaming does not break existing share links. → `{ "travel": { ... } }`. An empty body → 400.

### 7. `DELETE /api/travels/{idOrPrefix}`

Admin only. Permanently deletes the travel and everything in it. → `{ "success": true }`.

### 8. `GET /api/travels/{idOrPrefix}/expenses`

```json
{ "expenses": [{ "id": "...", "date": "2026-08-06", "description": "...", "amount": 42.5, "currency": "USD", "paidById": "...", "splitType": "equal", "confirmed": true, "paidBy": { ...member }, "splits": [{ "id": "...", "memberId": "...", "amount": null, "member": { ...member } }] }] }
```

### 9. `POST /api/travels/{idOrPrefix}/expenses`

Body: `{ "date": "YYYY-MM-DD", "description"?: string, "amount": number, "currency"?: string, "paidById": memberId, "extraPayers"?: string[], "splitType"?: "equal" | "manual", "splitMemberIds"?: string[], "confirmed"?: boolean, "splits"?: { [memberId]: string | null }, "imageUrl"?: string }` → 201 `{ "expense": { ... } }`.

`date`, `amount`, and `paidById` are required. `currency` defaults to the travel's `mainCurrency`. `paidById` must be a member id from the travel payload; invalid payer → 400. `splitMemberIds` defaults to all members. For manual splits, provide `splits` amounts (strings, e.g. `"21.25"`); equal splits leave them `null`.

Validation (invalid → 400): `date` must be a real `YYYY-MM-DD`; `amount` must be a JSON number > 0 (0, negatives, and strings are rejected); `currency` a whitelisted ISO 4217 code; `splitType` exactly `"equal"` or `"manual"`; `extraPayers` an array of member ids; `splitMemberIds` a non-empty array of member ids (omit it to split among all members); `splits` keys must be member ids, values non-negative numbers, and their total must not exceed `amount` (it may be less — partial splits are allowed).

### 10. `GET /api/travels/{idOrPrefix}/expenses/{eid}`

```json
{ "expense": { "id": "...", "date": "...", "amount": 42.5, "paidBy": { ... }, "splits": [ ... ] } }
```

### 11. `PUT /api/travels/{idOrPrefix}/expenses/{eid}`

Same fields as POST (replaces the expense and its splits). → `{ "expense": { ... } }`.

### 12. `DELETE /api/travels/{idOrPrefix}/expenses/{eid}`

→ `{ "success": true }`.

### 13. `GET` / `PUT /api/travels/{idOrPrefix}/rates`

`GET` → `{ "rates": [{ "id": "...", "travelId": "...", "fromCurrency": "EUR", "toCurrency": "USD", "rate": 1.09, "updatedAt": "..." }] }`.

`PUT` body: `{ "fromCurrency": "EUR", "rate": 1.09 }` — upserts the rate from `fromCurrency` to the travel's `mainCurrency`. → `{ "rate": { ... } }`. `fromCurrency` must be a whitelisted ISO 4217 code (fake codes like `XXX` → 400) and cannot equal the travel's `mainCurrency`; `rate` a positive number — violations → 400.

### 14. `GET /api/travels/{idOrPrefix}/members`

`{ "members": [{ "id": "...", "name": "...", "isAdmin": true }] }` — read-only; member create/update/delete is not exposed (it goes through the invites/groups flow in the UI), and this route returns 404 in single-user mode.

## Guidance

- Amounts are JSON numbers; dates are `YYYY-MM-DD`; currencies are whitelisted ISO 4217 codes (e.g. USD, EUR — `XXX` and other fake codes are rejected; lowercase codes like `eur` are accepted and normalized to uppercase).
- `paidById` must be a member id from the travel payload; invalid payer → 400.
- Equal split: splits are auto-created for `splitMemberIds` (defaults to all members) with `amount: null` — compute each share as `amount / number of split members`.
- Manual split: `splits: { "<memberId>": "<amount>" }` — the total may be **less** than `amount` (partial allocation is allowed), but must not exceed it.
- Single-user mode has exactly one member (the Admin) — use its id for `paidById` and splits.
- Delete is permanent; confirm before deleting.
- Compute settlement/balance yourself from expenses; there is no balance endpoint.
