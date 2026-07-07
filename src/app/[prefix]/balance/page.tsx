'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  Container, Typography, Box, Card, CardContent, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Chip, CircularProgress, Grid, Paper, Button,
} from '@mui/material'
import { AccountBalance } from '@mui/icons-material'

export default function BalancePage() {
  const params = useParams()
  const router = useRouter()
  const prefix = params?.prefix as string
  const [travel, setTravel] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [rates, setRates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/travels/${prefix}`).then(r => r.json()),
      fetch(`/api/travels/${prefix}/expenses`).then(r => r.json()),
      fetch(`/api/travels/${prefix}/rates`).then(r => r.json()),
    ]).then(([t, e, r]) => {
      setTravel(t.travel)
      setExpenses(e.expenses || [])
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
    const payer = exp.paidById
    if (!balanceByMember[payer]) return

    const totalPerPerson = exp.splitType === 'equal'
      ? exp.amount / (travel.members?.length || 1)
      : 0

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

      if (split.memberId === payer) {
        balanceByMember[split.memberId][exp.currency] -= splitAmount
      } else {
        balanceByMember[split.memberId][exp.currency] -= splitAmount
      }
    })

    balanceByMember[payer][exp.currency] += exp.amount
  })

  // Calculate converted balances
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

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>Balance</Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Per Currency</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  {currencies.map((c: string) => (
                    <TableCell key={c} align="right">{c}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {travel.members?.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.name} {m.isAdmin ? <Chip label="Admin" size="small" color="primary" variant="outlined" /> : null}</TableCell>
                    {currencies.map((c: string) => {
                      const bal = balanceByMember[m.id][c] || 0
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

          <Grid container spacing={2} sx={{ mb: 2 }}>
            {currencies.filter(c => c !== travel.mainCurrency).map((c: string) => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={c}>
                <TextField
                  label={`1 ${c} = ? ${travel.mainCurrency}`}
                  type="number"
                  size="small"
                  fullWidth
                  value={rates[c] || ''}
                  onChange={e => updateRate(c, e.target.value)}
                  inputProps={{ step: '0.0001', min: '0' }}
                />
              </Grid>
            ))}
          </Grid>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell align="right">Balance ({travel.mainCurrency})</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {travel.members?.map((m: any) => {
                  const bal = convertedBalance[m.id] || 0
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{m.name}</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="subtitle1"
                          fontWeight="bold"
                          color={bal >= 0 ? 'success.main' : 'error.main'}
                        >
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
