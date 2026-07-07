'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  Container, Typography, Box, Card, CardContent, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Chip, CircularProgress, Paper, Switch,
  FormControlLabel, Button,
} from '@mui/material'
import { AccountBalance, GroupWork, PictureAsPdf } from '@mui/icons-material'

export default function BalancePage() {
  const params = useParams()
  const router = useRouter()
  const prefix = params?.prefix as string
  const [travel, setTravel] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [rates, setRates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [groupMode, setGroupMode] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [fetchMsg, setFetchMsg] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/travels/${prefix}`).then(r => r.json()),
      fetch(`/api/travels/${prefix}/expenses`).then(r => r.json()),
      fetch(`/api/travels/${prefix}/rates`).then(r => r.json()),
      fetch(`/api/travels/${prefix}/groups`).then(r => r.json()),
    ]).then(([t, e, r, g]) => {
      setTravel(t.travel)
      setExpenses(e.expenses || [])
      setGroups(g.groups || [])
      if (r.rates) {
        const rateMap: Record<string, string> = {}
        r.rates.forEach((rate: any) => {
          rateMap[rate.fromCurrency] = String(rate.rate)
        })
        setRates(rateMap)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [prefix])

  async function updateRate(currency: string, rate: string) {
    setRates({ ...rates, [currency]: rate })
    await fetch(`/api/travels/${prefix}/rates`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromCurrency: currency, rate: parseFloat(rate) || 0 }),
    })
  }

  async function fetchLiveRates() {
    setFetching(true)
    setFetchMsg('')
    try {
      const res = await fetch(`/api/rates-proxy?from=${travel.mainCurrency}`)
      const data = await res.json()
      const fetchedRates = data.rates || {}
      const currencyList = [travel.mainCurrency, ...(JSON.parse(travel.currencies || '[]'))]
      let count = 0
      for (const c of currencyList) {
        if (c !== travel.mainCurrency && fetchedRates[c] != null) {
          const inverted = (1 / fetchedRates[c]).toFixed(6)
          await updateRate(c, inverted)
          count++
        }
      }
      setFetchMsg(`Fetched rates for ${count} currencies`)
    } catch {
      setFetchMsg('Failed to fetch rates. Check your internet connection.')
    } finally {
      setFetching(false)
      setTimeout(() => setFetchMsg(''), 3000)
    }
  }

  if (loading) return <Box textAlign="center" py={4}><CircularProgress /></Box>
  if (!travel) return <Typography>Not found</Typography>

  const currencies = [travel.mainCurrency, ...(JSON.parse(travel.currencies || '[]'))]
  const confirmedExpenses = expenses.filter(e => e.confirmed)

  const balanceByMember: Record<string, Record<string, number>> = {}
  const convertedBalance: Record<string, number> = {}

  travel.members?.forEach((m: any) => {
    balanceByMember[m.id] = {}
    currencies.forEach((c: string) => { balanceByMember[m.id][c] = 0 })
    convertedBalance[m.id] = 0
  })

  confirmedExpenses.forEach((exp: any) => {
    if (!balanceByMember[exp.paidById]) return

    const extraPayers = (() => {
      try { return JSON.parse(exp.extraPayers || '[]') }
      catch { return [] }
    })()
    const extraPayerTotal = extraPayers.reduce((s: number, ep: any) => s + (ep.amount || 0), 0)

    balanceByMember[exp.paidById][exp.currency] += exp.amount - extraPayerTotal

    extraPayers.forEach((ep: any) => {
      if (balanceByMember[ep.memberId]) {
        balanceByMember[ep.memberId][exp.currency] += ep.amount
      }
    })

    const manualTotal = exp.splits?.reduce((sum: number, s: any) => sum + (s.amount || 0), 0) || 0
    const manualCount = exp.splits?.filter((s: any) => s.amount != null).length || 0
    const equalCount = (travel.members?.length || 1) - manualCount

    exp.splits?.forEach((split: any) => {
      let splitAmount = split.amount
      if (splitAmount == null) {
        const remaining = exp.amount - manualTotal
        splitAmount = equalCount > 0 ? remaining / equalCount : 0
      }
      if (!balanceByMember[split.memberId]) return
      balanceByMember[split.memberId][exp.currency] -= splitAmount
    })
  })

  travel.members?.forEach((m: any) => {
    let total = 0
    currencies.forEach((c: string) => {
      const bal = balanceByMember[m.id][c] || 0
      if (c === travel.mainCurrency) {
        total += bal
      } else if (rates[c]) {
        total += bal * parseFloat(rates[c])
      }
    })
    convertedBalance[m.id] = total
  })

  // Build display rows
  function getDisplayRows() {
    if (!groupMode || groups.length === 0) {
      return travel.members?.map((m: any) => ({
        type: 'member' as const,
        id: m.id,
        name: m.name,
        isAdmin: m.isAdmin,
        subLabels: null,
      })) || []
    }

    const groupMap = new Map<string, any[]>()
    const ungrouped: any[] = []

    groups.forEach((g: any) => {
      groupMap.set(g.id, g.members || [])
    })

    travel.members?.forEach((m: any) => {
      if (m.groupId) {
        // already handled via group
      } else {
        ungrouped.push(m)
      }
    })

    const rows: any[] = []

    groups.forEach((g: any) => {
      const memberIds = g.members?.map((m: any) => m.id) || []
      rows.push({
        type: 'group' as const,
        id: g.id,
        name: g.name,
        isAdmin: false,
        memberIds,
        subLabels: g.members?.map((m: any) => m.name) || [],
      })
    })

    ungrouped.forEach((m: any) => {
      rows.push({
        type: 'member' as const,
        id: m.id,
        name: m.name,
        isAdmin: m.isAdmin,
        subLabels: null,
      })
    })

    return rows
  }

  function getBalForRow(row: any, currency: string): number {
    if (row.type === 'member') return balanceByMember[row.id]?.[currency] || 0
    return row.memberIds.reduce((sum: number, id: string) => sum + (balanceByMember[id]?.[currency] || 0), 0)
  }

  function getConvBalForRow(row: any): number {
    if (row.type === 'member') return convertedBalance[row.id] || 0
    return row.memberIds.reduce((sum: number, id: string) => sum + (convertedBalance[id] || 0), 0)
  }

  const displayRows = getDisplayRows()

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h5">Balance</Typography>
          <Button size="small" variant="outlined" startIcon={<PictureAsPdf />} onClick={async () => {
            const { exportPdf } = await import('@/lib/exportPdf')
            await exportPdf(travel, expenses, groups, rates, groupMode)
          }}>
            Export PDF
          </Button>
        </Box>
        {groups.length > 0 && (
          <FormControlLabel
            control={<Switch checked={groupMode} onChange={e => setGroupMode(e.target.checked)} />}
            label={<Box display="flex" alignItems="center" gap={0.5}><GroupWork fontSize="small" /> Group Mode</Box>}
          />
        )}
      </Box>

      {groupMode && groups.length === 0 && (
        <Box mb={2}><Typography variant="body2" color="text.secondary">No groups created yet. Go to Groups page to create them.</Typography></Box>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Per Currency</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{groupMode ? 'Entity' : 'Member'}</TableCell>
                  {currencies.map((c: string) => (
                    <TableCell key={c} align="right">{c}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Typography fontWeight={row.type === 'group' ? 'bold' : 'medium'}>
                        {row.type === 'group' && <GroupWork sx={{ mr: 0.5, fontSize: 16, verticalAlign: 'text-top' }} />}
                        {row.name}
                      </Typography>
                      {row.subLabels && (
                        <Typography variant="caption" color="text.secondary">
                          {row.subLabels.join(', ')}
                        </Typography>
                      )}
                      {row.isAdmin && <Chip label="Admin" size="small" color="primary" variant="outlined" sx={{ ml: 1 }} />}
                    </TableCell>
                    {currencies.map((c: string) => {
                      const bal = getBalForRow(row, c)
                      return (
                        <TableCell key={c} align="right">
                          <Typography color={bal >= 0 ? 'success.main' : 'error.main'} fontWeight="medium">
                            {bal >= 0 ? '+' : ''}{bal.toFixed(2)}
                          </Typography>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Converted Balance (in {travel.mainCurrency})
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter exchange rates below to see converted balances. Positive means others owe them, negative means they owe.
          </Typography>

          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Button variant="outlined" size="small" onClick={fetchLiveRates} disabled={fetching}>
              {fetching ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
              Fetch Live Rates
            </Button>
            {fetchMsg && (
              <Typography variant="caption" color={fetchMsg.includes('Failed') ? 'error' : 'success.main'}>
                {fetchMsg}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            {currencies.filter(c => c !== travel.mainCurrency).map((c: string) => (
              <TextField key={c}
                label={`1 ${c} = ? ${travel.mainCurrency}`}
                type="number" size="small"
                value={rates[c] || ''}
                onChange={e => updateRate(c, e.target.value)}
                inputProps={{ step: '0.0001', min: '0' }}
                sx={{ width: 180 }}
              />
            ))}
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{groupMode ? 'Entity' : 'Member'}</TableCell>
                  <TableCell align="right">Balance ({travel.mainCurrency})</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((row: any) => {
                  const bal = getConvBalForRow(row)
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Typography fontWeight={row.type === 'group' ? 'bold' : 'medium'}>
                          {row.type === 'group' && <GroupWork sx={{ mr: 0.5, fontSize: 16, verticalAlign: 'text-top' }} />}
                          {row.name}
                        </Typography>
                        {row.subLabels && (
                          <Typography variant="caption" color="text.secondary">
                            {row.subLabels.join(', ')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1" fontWeight="bold"
                          color={bal >= 0 ? 'success.main' : 'error.main'}>
                          {bal >= 0 ? '+' : ''}{bal.toFixed(2)} {travel.mainCurrency}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Container>
  )
}
