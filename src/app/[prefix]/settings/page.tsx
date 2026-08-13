'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

import {
  Container, Typography, Box, Card, CardContent, TextField,
  Button, Grid, FormControl, InputLabel, Select, MenuItem,
  Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControlLabel, Switch,
} from '@mui/material'
import { ArrowBack, ContentCopy } from '@mui/icons-material'
import { useT } from '@/lib/i18n/LanguageContext'
import { appUrl } from '@/lib/utils'
import { isSingleUserMode, resolveCurrentMember } from '@/lib/single-user'

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
  const [keys, setKeys] = useState<any[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)
  const [revealKey, setRevealKey] = useState('')
  const [copiedSkills, setCopiedSkills] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  const [form, setForm] = useState({
    name: '', mainCurrency: 'USD',
    startDate: '', endDate: '', expensePermission: 1, allowMemberCreate: false,
  })
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([])
  const [availableCurrencies] = useState([
    'USD','EUR','GBP','JPY','CNY','KRW','THB','SGD','HKD','AUD',
    'CAD','CHF','INR','MXN','BRL','ZAR','SEK','NOK','DKK','NZD',
  ])

  useEffect(() => {
    fetch(appUrl(`/api/travels/${prefix}`)).then(r => r.json()).then(data => {
      if (data.travel) {
        const t = data.travel
        setForm({
          name: t.name,
          mainCurrency: t.mainCurrency,
          startDate: t.startDate || '',
          endDate: t.endDate || '',
          expensePermission: t.expensePermission,
          allowMemberCreate: t.allowMemberCreate === true,
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
      const res = await fetch(appUrl(`/api/travels/${prefix}`), {
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
    await fetch(appUrl(`/api/travels/${prefix}`), { method: 'DELETE' })
    router.push('/')
  }

  async function loadKeys() {
    try {
      const res = await fetch(appUrl('/api/keys'))
      const data = await res.json()
      if (res.ok) setKeys(data.keys || [])
      else setError(data.error || 'Failed to load keys')
    } catch (e: any) {
      setError(e.message)
    }
  }

  useEffect(() => {
    loadKeys()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreateKey() {
    setCreating(true)
    setError('')
    try {
      const res = await fetch(appUrl('/api/keys'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create key')
      setCreateOpen(false)
      setCreateName('')
      setRevealKey(data.key)
      loadKeys()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(keyId: string) {
    setError('')
    try {
      const res = await fetch(appUrl(`/api/keys/${keyId}`), { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to revoke key')
      loadKeys()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentUser = resolveCurrentMember(travel?.members, (session?.user as any)?.id)
  const isAdmin = currentUser?.isAdmin

  if (loading) return <Box textAlign="center" py={4}><CircularProgress /></Box>
  if (!travel) return <Typography>{t('common.notFound')}</Typography>

  return (
    <Container maxWidth="md" sx={{ mt: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Typography variant="h5">{t('settings.title')}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {isAdmin && (
        <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{t('settings.travelDetails')}</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t('travel.travelName')} fullWidth value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
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
                onChange={e => {
                  const v = e.target.value.toUpperCase()
                  setForm({ ...form, mainCurrency: v })
                  setSelectedCurrencies(prev => prev.filter(c => c !== v))
                }} />
            </Grid>
            {!isSingleUserMode() && (
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
            )}
          </Grid>

          {!isSingleUserMode() && (
            <FormControlLabel
              control={<Switch checked={form.allowMemberCreate} onChange={e => setForm({ ...form, allowMemberCreate: e.target.checked })} />}
              label="Allow invited users to create their own member entry"
              sx={{ mt: 2, mb: 0 }}
            />
          )}

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
        </>
      )}

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

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>API Keys (AI access)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create keys for AI agents. Agents authenticate with <code>Authorization: Bearer &lt;key&gt;</code> and read the skills guide.
          </Typography>
          <Box mb={2} display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="body2">AI skills guide:</Typography>
            <code>{appUrl('/ai/SKILL.md')}</code>
            <Button size="small" variant="outlined"
              startIcon={copiedSkills ? undefined : <ContentCopy />}
              onClick={() => copyToClipboard(appUrl('/ai/SKILL.md'), setCopiedSkills)}>
              {copiedSkills ? 'Copied' : 'Copy'}
            </Button>
          </Box>
          {keys.map(k => (
            <Box key={k.id} display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
              <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 120 }}>{k.name}</Typography>
              <Typography variant="body2" component="code" sx={{ fontFamily: 'monospace' }}>{k.keyPrefix}&hellip;</Typography>
              <Typography variant="body2" color="text.secondary">
                created {new Date(k.createdAt).toLocaleDateString()}
                {k.lastUsedAt ? ` &middot; last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : ''}
              </Typography>
              <Button size="small" color="error" onClick={() => handleRevoke(k.id)}>Revoke</Button>
            </Box>
          ))}
          <Button variant="contained" onClick={() => setCreateOpen(true)}>Create key</Button>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogTitle>Create API key</DialogTitle>
        <DialogContent>
          <TextField label="Name" fullWidth value={createName} sx={{ mt: 1 }}
            onChange={e => setCreateName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateKey} disabled={creating || !createName.trim()}>
            {creating ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!revealKey} onClose={() => setRevealKey('')}>
        <DialogTitle>API key created</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            This key is shown only once — copy it now.
          </Typography>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <code style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{revealKey}</code>
            <Button size="small" variant="outlined"
              startIcon={copiedKey ? undefined : <ContentCopy />}
              onClick={() => copyToClipboard(revealKey, setCopiedKey)}>
              {copiedKey ? 'Copied' : 'Copy'}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevealKey('')}>Close</Button>
        </DialogActions>
      </Dialog>

      {isAdmin && (
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
      )}

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
