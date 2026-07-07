'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

import {
  Container, Typography, Box, Card, CardContent, TextField,
  Button, Grid, FormControl, InputLabel, Select, MenuItem,
  FormControlLabel, Switch, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Alert,
} from '@mui/material'
import { ArrowBack, Calculate } from '@mui/icons-material'

export default function NewExpensePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const prefix = params?.prefix as string
  const [travel, setTravel] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [calcOpen, setCalcOpen] = useState(false)
  const [calcValue, setCalcValue] = useState('')

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    currency: 'USD',
    paidById: '',
    splitType: 'equal',
    confirmed: true,
  })
  const [splits, setSplits] = useState<Record<string, string>>({})
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/travels/${prefix}`).then(r => r.json()).then(data => {
      if (data.travel) {
        setTravel(data.travel)
        setForm(f => ({ ...f, currency: data.travel.mainCurrency }))
        const currentUser = data.travel.members?.find(
          (m: any) => m.userId === (session?.user as any)?.id
        )
        if (currentUser) setForm(f => ({ ...f, paidById: currentUser.id }))
      }
    })
  }, [prefix, session])

  const currencies = travel
    ? [travel.mainCurrency, ...(JSON.parse(travel.currencies || '[]'))]
    : ['USD']

  const members = travel?.members || []

  function handleCalcResult(val: string) {
    setForm({ ...form, amount: val })
    setCalcOpen(false)
  }

  async function handleSubmit() {
    if (!form.amount || !form.paidById) {
      setError('Amount and payer are required')
      return
    }
    setSaving(true)
    setError('')

    try {
      let imageUrl = ''
      if (imageFile) {
        const imgData = new FormData()
        imgData.append('file', imageFile)
        const imgRes = await fetch('/api/upload', { method: 'POST', body: imgData })
        if (imgRes.ok) {
          const imgJson = await imgRes.json()
          imageUrl = imgJson.url
        }
      }

      const body = {
        ...form,
        amount: parseFloat(form.amount),
        splits: Object.entries(splits).reduce((acc: any, [k, v]) => {
          if (v) acc[k] = parseFloat(v)
          return acc
        }, {} as Record<string, number>),
        imageUrl,
      }

      const res = await fetch(`/api/travels/${prefix}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create expense')
      router.push(`/${prefix}/expenses`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container maxWidth="md" sx={{ mt: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton onClick={() => router.back()}><ArrowBack /></IconButton>
        <Typography variant="h5">New Expense</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Date" type="date" fullWidth value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select value={form.currency} label="Currency"
                  onChange={e => setForm({ ...form, currency: e.target.value })}>
                  {currencies.map((c: string) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField label="Description" fullWidth value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </Grid>
            <Grid size={12}>
              <Box display="flex" gap={1} alignItems="flex-end">
                <TextField label="Amount" type="number" fullWidth value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })} />
                <IconButton color="primary" onClick={() => { setCalcValue(form.amount); setCalcOpen(true) }}>
                  <Calculate />
                </IconButton>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Paid By</InputLabel>
                <Select value={form.paidById} label="Paid By"
                  onChange={e => setForm({ ...form, paidById: e.target.value })}>
                  {members.map((m: any) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Split Type</InputLabel>
                <Select value={form.splitType} label="Split Type"
                  onChange={e => {
                    setForm({ ...form, splitType: e.target.value })
                    if (e.target.value === 'equal') setSplits({})
                  }}>
                  <MenuItem value="equal">Split Equally</MenuItem>
                  <MenuItem value="manual">Manual Split</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {form.splitType === 'manual' && (
              <Grid size={12}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Enter amounts per person (leave empty for equal split of remaining)
                </Typography>
                {members.map((m: any) => (
                  <Box key={m.id} display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography sx={{ minWidth: 100 }}>{m.name}:</Typography>
                    <TextField size="small" type="number" value={splits[m.id] || ''}
                      onChange={e => setSplits({ ...splits, [m.id]: e.target.value })}
                      placeholder="Equal" />
                  </Box>
                ))}
              </Grid>
            )}
            <Grid size={12}>
              <FormControlLabel
                control={<Switch checked={form.confirmed}
                  onChange={e => setForm({ ...form, confirmed: e.target.checked })} />}
                label={form.confirmed ? 'Confirmed' : 'Not Confirmed (pre-booked)'}
              />
            </Grid>
            <Grid size={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Receipt Image (optional)
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Button variant="outlined" component="label">
                  Choose File
                  <input type="file" hidden accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setImageFile(file)
                        setImagePreview(URL.createObjectURL(file))
                      }
                    }} />
                </Button>
                {imagePreview && (
                  <Box>
                    <img src={imagePreview} alt="Preview" style={{ maxHeight: 80, borderRadius: 4 }} />
                    <IconButton size="small" onClick={() => { setImageFile(null); setImagePreview(null) }}>
                      ×
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>

          <Box mt={3} display="flex" gap={1} justifyContent="flex-end">
            <Button onClick={() => router.back()}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit} disabled={saving}>
              {saving ? <CircularProgress size={20} /> : 'Save Expense'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <CalculatorDialog open={calcOpen} value={calcValue}
        onResult={handleCalcResult} onClose={() => setCalcOpen(false)} />
    </Container>
  )
}

function CalculatorDialog({ open, value, onResult, onClose }: any) {
  const [display, setDisplay] = useState(value || '0')
  const [op, setOp] = useState<string | null>(null)
  const [prev, setPrev] = useState<number | null>(null)

  function inputNum(n: string) {
    if (display === '0' && n !== '.') setDisplay(n)
    else setDisplay(display + n)
  }

  function handleOp(op: string) {
    setPrev(parseFloat(display))
    setDisplay('0')
    setOp(op)
  }

  function calculate() {
    const cur = parseFloat(display)
    let result = 0
    switch (op) {
      case '+': result = (prev || 0) + cur; break
      case '-': result = (prev || 0) - cur; break
      case '*': result = (prev || 0) * cur; break
      case '/': result = cur !== 0 ? (prev || 0) / cur : 0; break
      default: result = cur
    }
    setDisplay(result.toFixed(2))
    setOp(null)
    setPrev(null)
  }

  function clear() {
    setDisplay('0')
    setOp(null)
    setPrev(null)
  }

  function btn(n: string) {
    return (
      <Button variant="outlined" fullWidth onClick={() => inputNum(n)} sx={{ py: 2, fontSize: 18 }}>
        {n}
      </Button>
    )
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Calculator</DialogTitle>
      <DialogContent>
        <TextField fullWidth value={display} sx={{ mb: 2, input: { textAlign: 'right', fontSize: 24 } }}
          InputProps={{ readOnly: true }} />
        <Grid container spacing={1}>
          {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].map((k, i) => (
            <Grid size={3} key={i}>
              {k === '=' ? (
                <Button variant="contained" fullWidth onClick={calculate} sx={{ py: 2, fontSize: 18 }}>
                  =
                </Button>
              ) : ['/','*','-','+'].includes(k) ? (
                <Button variant="outlined" color="secondary" fullWidth onClick={() => handleOp(k)}
                  sx={{ py: 2, fontSize: 18 }}>
                  {k}
                </Button>
              ) : (
                btn(k)
              )}
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={clear}>Clear</Button>
        <Button onClick={() => onResult(display)}>Use Value</Button>
      </DialogActions>
    </Dialog>
  )
}
