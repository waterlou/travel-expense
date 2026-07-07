'use client'
import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useThemeMode } from '@/lib/ThemeContext'
import { useT } from '@/lib/i18n/LanguageContext'

import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs from 'dayjs'
import {
  Container, Box, Typography, Button, Card, CardContent,
  AppBar, Toolbar, IconButton, Menu, MenuItem,
  List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, CircularProgress, Alert,
} from '@mui/material'
import {
  Add, Logout, TravelExplore, Google,
  ChevronRight, Menu as MenuIcon,
  DarkMode, LightMode,
} from '@mui/icons-material'
import { SessionProvider } from 'next-auth/react'

function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { mode, toggleTheme } = useThemeMode()
  const { t } = useT()
  const [travels, setTravels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinDialog, setJoinDialog] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [form, setForm] = useState<any>({
    name: '', prefix: '', mainCurrency: 'USD',
    startDate: null, endDate: null, permissions: 1,
    members: [{ name: '', isAdmin: true }],
  })
  const [availableCurrencies] = useState([
    'USD','EUR','GBP','JPY','CNY','KRW','THB','SGD','HKD','AUD',
    'CAD','CHF','INR','MXN','BRL','ZAR','SEK','NOK','DKK','NZD',
  ])
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') return
    if (status === 'authenticated') {
      fetch('/api/travels').then(r => r.json()).then(data => {
        setTravels(data.travels || [])
        setLoading(false)
      }).catch(() => setLoading(false))
    }
  }, [status])

  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <Box minHeight="100vh" display="flex" flexDirection="column">
        <AppBar position="static">
          <Toolbar>
            <TravelExplore sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>TravelExpense</Typography>
            <Button color="inherit" onClick={() => signIn('google')}>
              <Google sx={{ mr: 1 }} /> {t('auth.signInGoogle')}
            </Button>
          </Toolbar>
        </AppBar>
        <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
          <TravelExplore sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom>TravelExpense</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Track shared expenses for your trips. Split bills, manage currencies, and settle up easily.
          </Typography>
          <Button variant="contained" size="large" onClick={() => signIn('google')} startIcon={<Google />}>
            {t('auth.signInGoogle')}
          </Button>
        </Container>
      </Box>
    )
  }

  return (
    <Box minHeight="100vh">
      <AppBar position="static">
        <Toolbar>
          <TravelExplore sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>TravelExpense</Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {session?.user?.email}
          </Typography>
          <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 1 }}>
            {mode === 'dark' ? <LightMode /> : <DarkMode />}
          </IconButton>
          <Button color="inherit" onClick={() => signOut({ callbackUrl: '/' })}>{t('auth.signOut')}</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4, pb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">{t('travel.yourTravels')}</Typography>
          <Box>
            <Button variant="outlined" startIcon={<Add />} onClick={() => setJoinDialog(true)} sx={{ mr: 1 }}>
              {t('travel.join')}
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              {t('travel.newTravel')}
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box textAlign="center" py={4}><CircularProgress /></Box>
        ) : travels.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography color="text.secondary" gutterBottom>
                {t('travel.noTravels')}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <List>
            {travels.map((travel: any) => (
              <Card key={travel.id} sx={{ mb: 1 }}>
                <ListItem component="div" onClick={() => router.push(`/${travel.prefix}`)} sx={{ cursor: 'pointer' }}>
                  <ListItemText
                    primary={travel.name}
                    secondary={`${travel.members?.length || 0} members · ${travel.mainCurrency}`}
                  />
                  <ChevronRight />
                </ListItem>
              </Card>
            ))}
          </List>
        )}
      </Container>

      <CreateTravelDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        form={form}
        setForm={setForm}
        selectedCurrencies={selectedCurrencies}
        setSelectedCurrencies={setSelectedCurrencies}
        availableCurrencies={availableCurrencies}
        onCreated={(prefix: string) => router.push(`/${prefix}`)}
        setError={setError}
      />

      <JoinDialog
        open={joinDialog}
        onClose={() => setJoinDialog(false)}
        onJoined={(prefix: string) => router.push(`/${prefix}`)}
        setError={setError}
      />
    </Box>
  )
}

function CreateTravelDialog({
  open, onClose, form, setForm, selectedCurrencies, setSelectedCurrencies,
  availableCurrencies, onCreated, setError,
}: any) {
  const { t } = useT()
  const [saving, setSaving] = useState(false)
  const [currencySearch, setCurrencySearch] = useState('')

  async function handleCreate() {
    if (!form.name.trim() || !form.prefix.trim()) {
      setError(t('travel.nameRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const body = {
        ...form,
        startDate: form.startDate?.format?.('YYYY-MM-DD') || '',
        endDate: form.endDate?.format?.('YYYY-MM-DD') || '',
        currencies: selectedCurrencies,
      }
      const res = await fetch('/api/travels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create travel')
      onCreated(data.travel.prefix)
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('travel.createTravel')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label={t('travel.travelName')} fullWidth value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
          <TextField label={t('travel.urlPrefix')} fullWidth value={form.prefix}
            onChange={e => setForm({ ...form, prefix: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            helperText={t('travel.urlPrefixHelp')} />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <DatePicker
                  label={t('travel.startDate')}
                  value={form.startDate}
                  onChange={(v: any) => setForm({ ...form, startDate: v })}
                  slotProps={{ textField: { fullWidth: true, size: 'medium' } }}
                  sx={{ flex: 1 }}
                />
                <Typography variant="h5" sx={{ mt: 1 }}>→</Typography>
                <DatePicker
                  label={t('travel.endDate')}
                  value={form.endDate}
                  onChange={(v: any) => setForm({ ...form, endDate: v })}
                  slotProps={{ textField: { fullWidth: true, size: 'medium' } }}
                  sx={{ flex: 1 }}
                />
              </Box>
            </LocalizationProvider>
          <TextField label={t('travel.mainCurrency')} fullWidth value={form.mainCurrency}
            onChange={e => setForm({ ...form, mainCurrency: e.target.value.toUpperCase() })} />

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('travel.additionalCurrencies')}
            </Typography>
            <TextField size="small" placeholder={t('misc.searchCurrencies')} fullWidth value={currencySearch}
              onChange={e => setCurrencySearch(e.target.value.toUpperCase())} sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 120, overflow: 'auto' }}>
              {availableCurrencies
                .filter((c: string) => c !== form.mainCurrency && c.includes(currencySearch))
                .map((c: string) => (
                  <Chip key={c} label={c} size="small"
                    variant={selectedCurrencies.includes(c) ? 'filled' : 'outlined'}
                    color={selectedCurrencies.includes(c) ? 'primary' : 'default'}
                    onClick={() => {
                      if (selectedCurrencies.includes(c)) {
                        setSelectedCurrencies(selectedCurrencies.filter((x: string) => x !== c))
                      } else if (selectedCurrencies.length < 10) {
                        setSelectedCurrencies([...selectedCurrencies, c])
                      }
                    }}
                    disabled={!selectedCurrencies.includes(c) && selectedCurrencies.length >= 10} />
                ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('travel.expensePermission')}
            </Typography>
            <TextField select fullWidth value={form.permissions}
              onChange={e => setForm({ ...form, permissions: Number(e.target.value) })}
              SelectProps={{ native: true }}>
              <option value={1}>{t('travel.permission1')}</option>
              <option value={2}>{t('travel.permission2')}</option>
              <option value={3}>{t('travel.permission3')}</option>
              <option value={4}>{t('travel.permission4')}</option>
            </TextField>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('travel.travelMembers')}
            </Typography>
            {form.members.map((m: any, i: number) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField size="small" label={t('common.name')} fullWidth value={m.name}
                  onChange={e => {
                    const members = [...form.members]
                    members[i] = { ...members[i], name: e.target.value }
                    setForm({ ...form, members })
                  }} />
                <Button size="small" variant={m.isAdmin ? 'contained' : 'outlined'}
                  onClick={() => {
                    const members = [...form.members]
                    members[i] = { ...members[i], isAdmin: !members[i].isAdmin }
                    setForm({ ...form, members })
                  }}
                  sx={{ minWidth: 80 }}>
                  {m.isAdmin ? t('member.admin') : t('member.member')}
                </Button>
                {form.members.length > 1 && (
                  <IconButton size="small" onClick={() => {
                    setForm({ ...form, members: form.members.filter((_: any, j: number) => j !== i) })
                  }}><Typography color="error">×</Typography></IconButton>
                )}
              </Box>
            ))}
            {form.members.length < 20 && (
              <Button size="small" onClick={() =>
                setForm({ ...form, members: [...form.members, { name: '', isAdmin: false }] })
              }>{t('travel.addMember')}</Button>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={handleCreate} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : t('travel.createTravel')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function JoinDialog({ open, onClose, onJoined, setError }: any) {
  const { t } = useT()
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)

  async function handleJoin() {
    if (!code.trim()) return
    setJoining(true)
    setError('')
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid code')
      onJoined(data.prefix)
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('travel.join')}</DialogTitle>
      <DialogContent>
        <TextField label={t('travel.inviteCode')} fullWidth value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={handleJoin} disabled={joining}>
          {joining ? <CircularProgress size={20} /> : t('travel.join')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function Page() {
  return (
    <SessionProvider>
      <HomePage />
    </SessionProvider>
  )
}
