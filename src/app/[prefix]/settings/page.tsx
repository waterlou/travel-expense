'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

import {
  Container, Typography, Box, Card, CardContent, TextField,
  Button, Grid, FormControl, InputLabel, Select, MenuItem,
  Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useT } from '@/lib/i18n/LanguageContext'

export default function SettingsPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { t, locale, setLocale, LOCALE_LABELS } = useT()
  const prefix = params?.prefix as string
  const [travel, setTravel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [form, setForm] = useState({
    name: '', prefix: '', mainCurrency: 'USD',
    startDate: '', endDate: '', expensePermission: 1,
  })
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([])
  const [availableCurrencies] = useState([
    'USD','EUR','GBP','JPY','CNY','KRW','THB','SGD','HKD','AUD',
    'CAD','CHF','INR','MXN','BRL','ZAR','SEK','NOK','DKK','NZD',
  ])

  useEffect(() => {
    fetch(`/api/travels/${prefix}`).then(r => r.json()).then(data => {
      if (data.travel) {
        const t = data.travel
        setForm({
          name: t.name,
          prefix: t.prefix,
          mainCurrency: t.mainCurrency,
          startDate: t.startDate || '',
          endDate: t.endDate || '',
          expensePermission: t.expensePermission,
        })
        setSelectedCurrencies(JSON.parse(t.currencies || '[]'))
        setTravel(t)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [prefix])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/travels/${prefix}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          currencies: selectedCurrencies,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      setSuccess(t('settings.saved'))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    await fetch(`/api/travels/${prefix}`, { method: 'DELETE' })
    router.push('/')
  }

  const currentUser = travel?.members?.find((m: any) => m.userId === (session?.user as any)?.id)
  const isAdmin = currentUser?.isAdmin

  if (loading) return <Box textAlign="center" py={4}><CircularProgress /></Box>
  if (!travel) return <Typography>{t('common.notFound')}</Typography>
  if (!isAdmin) return <Container sx={{ mt: 3 }}><Typography>{t('error.notAdmin')}</Typography></Container>

  return (
    <Container maxWidth="md" sx={{ mt: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Typography variant="h5">{t('settings.title')}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{t('settings.travelDetails')}</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t('travel.travelName')} fullWidth value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t('travel.urlPrefix')} fullWidth value={form.prefix}
                onChange={e => setForm({ ...form, prefix: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t('travel.startDate')} type="date" fullWidth value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t('travel.endDate')} type="date" fullWidth value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t('travel.mainCurrency')} fullWidth value={form.mainCurrency}
                onChange={e => setForm({ ...form, mainCurrency: e.target.value.toUpperCase() })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t('travel.expensePermission')}</InputLabel>
                <Select value={form.expensePermission} label={t('travel.expensePermission')}
                  onChange={e => setForm({ ...form, expensePermission: Number(e.target.value) })}>
                  <MenuItem value={1}>{t('travel.permission1')}</MenuItem>
                  <MenuItem value={2}>{t('travel.permission2')}</MenuItem>
                  <MenuItem value={3}>{t('travel.permission3')}</MenuItem>
                  <MenuItem value={4}>{t('travel.permission4')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box mt={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('travel.additionalCurrencies')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {availableCurrencies
                .filter(c => c !== form.mainCurrency)
                .map(c => (
                  <Chip key={c} label={c} size="small"
                    variant={selectedCurrencies.includes(c) ? 'filled' : 'outlined'}
                    color={selectedCurrencies.includes(c) ? 'primary' : 'default'}
                    onClick={() => {
                      if (selectedCurrencies.includes(c)) {
                        setSelectedCurrencies(selectedCurrencies.filter(x => x !== c))
                      } else if (selectedCurrencies.length < 10) {
                        setSelectedCurrencies([...selectedCurrencies, c])
                      }
                    }}
                    disabled={!selectedCurrencies.includes(c) && selectedCurrencies.length >= 10} />
                ))}
            </Box>
          </Box>

          <Box mt={3} display="flex" gap={1}>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={20} /> : t('settings.saveChanges')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{t('settings.language')}</Typography>
          <FormControl fullWidth size="small" sx={{ maxWidth: 300 }}>
            <Select value={locale} onChange={e => setLocale(e.target.value as any)}>
              {(Object.entries(LOCALE_LABELS) as [string, string][]).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom color="error">{t('settings.dangerZone')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('settings.dangerDesc')}
          </Typography>
          <Button color="error" variant="outlined" onClick={() => setDeleteOpen(true)}>
            {t('settings.deleteTravel')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>{t('settings.deleteTravel')}?</DialogTitle>
        <DialogContent>
          <Typography>{t('settings.deleteConfirm')} "{travel.name}"? {t('settings.allData')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>{t('common.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
