'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Container, Typography, Box, Card, CardContent, List, ListItem,
  ListItemText, Chip, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, CircularProgress,
  Fab, ImageList, ImageListItem, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material'
import { Add, Edit, Delete, Image } from '@mui/icons-material'
import { useT } from '@/lib/i18n/LanguageContext'
import { appUrl } from '@/lib/utils'

export default function ExpensesPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useT()
  const prefix = params?.prefix as string
  const [travel, setTravel] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [currencyFilter, setCurrencyFilter] = useState('all')
  const [confirmedFilter, setConfirmedFilter] = useState('all')

  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch(appUrl(`/api/travels/${prefix}`)).then(r => r.json()),
      fetch(appUrl(`/api/travels/${prefix}/expenses`)).then(r => r.json()),
    ]).then(([t, e]) => {
      setTravel(t.travel)
      const sorted = (e.expenses || []).sort((a: any, b: any) => a.date.localeCompare(b.date))
      setExpenses(sorted)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [prefix])

  useEffect(() => {
    if (!loading && listRef.current) {
      setTimeout(() => {
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 100)
    }
  }, [loading])

  async function handleDelete(id: string) {
    await fetch(appUrl(`/api/travels/${prefix}/expenses/${id}`), { method: 'DELETE' })
    setExpenses(expenses.filter(e => e.id !== id))
    setDeleteTarget(null)
  }

  if (loading) return <Box textAlign="center" py={4}><CircularProgress /></Box>
  if (!travel) return <Typography>{t('common.notFound')}</Typography>

  const currentUser = travel.members?.find((m: any) => m.userId === (session?.user as any)?.id)
  const isAdmin = currentUser?.isAdmin
  const permission = travel.expensePermission

  let filtered = expenses
  if (currencyFilter !== 'all') filtered = filtered.filter(e => e.currency === currencyFilter)
  if (confirmedFilter === 'confirmed') filtered = filtered.filter(e => e.confirmed)
  if (confirmedFilter === 'unconfirmed') filtered = filtered.filter(e => !e.confirmed)

  const currencies = [travel.mainCurrency, ...(JSON.parse(travel.currencies || '[]'))]

  function getPayersInfo(exp: any, members: any[]) {
    const primaryPayer = exp.paidBy?.name || t('misc.unknown')
    const extraPayers = (() => {
      try { return JSON.parse(exp.extraPayers || '[]') }
      catch { return [] }
    })()
    if (extraPayers.length === 0) return `${primaryPayer} ${t('misc.paid')}`
    const extraNames = extraPayers.map((ep: any) => {
      const m = members?.find((mm: any) => mm.id === ep.memberId)
      return m?.name || t('misc.unknown')
    })
    return `${primaryPayer} + ${extraNames.join(', ')} ${t('misc.paid')}`
  }

  function calcSplitAmount(exp: any, split: any, memberCount: number) {
    if (split.amount != null) {
      return { amount: split.amount, isCalculated: false }
    }
    const manualTotal = exp.splits?.reduce((s: number, sp: any) => s + (sp.amount || 0), 0) || 0
    const manualCount = exp.splits?.filter((sp: any) => sp.amount != null).length || 0
    const equalCount = memberCount - manualCount
    const remaining = exp.amount - manualTotal
    return { amount: equalCount > 0 ? remaining / equalCount : 0, isCalculated: true }
  }

  function groupByDate(exps: any[]): [string, any[]][] {
    const map = new Map<string, any[]>()
    for (const exp of exps) {
      const d = exp.date || 'Unknown'
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(exp)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }

  function formatDateHeader(date: string): string {
    const d = new Date(date)
    if (isNaN(d.getTime())) return date
    return d.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5">{t('nav.expenses')}</Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>{t('expense.filterCurrency')}</InputLabel>
            <Select value={currencyFilter} label={t('expense.filterCurrency')} onChange={e => setCurrencyFilter(e.target.value)}>
              <MenuItem value="all">{t('expense.all')}</MenuItem>
              {currencies.map((c: string) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{t('expense.filterStatus')}</InputLabel>
            <Select value={confirmedFilter} label={t('expense.filterStatus')} onChange={e => setConfirmedFilter(e.target.value)}>
              <MenuItem value="all">{t('expense.all')}</MenuItem>
              <MenuItem value="confirmed">{t('expense.statusConfirmed')}</MenuItem>
              <MenuItem value="unconfirmed">{t('expense.statusUnconfirmed')}</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Add />} onClick={() => router.push(`/${prefix}/expenses/new`)}
            sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
            {t('expense.addExpense')}
          </Button>
        </Box>
      </Box>

      {filtered.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">{t('expense.noExpenses')}</Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {groupByDate(filtered).map(([date, exps]) => (
            <Box key={date} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, px: 1 }}>
                {formatDateHeader(date)}
              </Typography>
              {exps.map((exp: any) => {
                const isCreator = exp.paidById === currentUser?.id
                const canEdit = isAdmin || (permission >= 3 && isCreator) || permission >= 4
                const canDel = isAdmin || (permission >= 3 && isCreator) || permission >= 4

                return (
                  <Card key={exp.id} sx={{ mb: 1 }}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography>{exp.description || t('misc.noDescription')}</Typography>
                            {!exp.confirmed && <Chip label={t('expense.statusUnconfirmed')} size="small" color="warning" variant="outlined" />}
                            {exp.imageUrl && <Image fontSize="small" color="action" />}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {getPayersInfo(exp, travel.members)}
                            </Typography>
                            {exp.splits?.map((s: any) => {
                              const { amount, isCalculated } = calcSplitAmount(exp, s, travel.members?.length || 1)
                              return (
                                <Chip key={s.id} size="small"
                                  label={`${s.member?.name}: ${amount.toFixed(2)}`}
                                  variant={isCalculated ? 'outlined' : 'filled'}
                                  color={isCalculated ? 'default' : 'primary'}
                                  sx={{
                                    mr: 0.5, mt: 0.5,
                                    fontStyle: isCalculated ? 'italic' : 'normal',
                                    opacity: isCalculated ? 0.7 : 1,
                                  }}
                                />
                              )
                            })}
                          </Box>
                        }
                      />
                      <Box textAlign="right">
                        <Typography variant="subtitle1" fontWeight="bold">
                          {exp.amount.toFixed(2)} {exp.currency}
                        </Typography>
                        <Box>
                          {canEdit && (
                            <IconButton size="small" onClick={() => router.push(`/${prefix}/expenses/${exp.id}`)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          )}
                          {canDel && (
                            <IconButton size="small" onClick={() => setDeleteTarget(exp)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    </ListItem>
                    {exp.imageUrl && (
                      <Box sx={{ px: 2, pb: 1 }}>
                        <img src={appUrl(exp.imageUrl)} alt="Expense" style={{ maxHeight: 150, borderRadius: 4 }} />
                      </Box>
                    )}
                  </Card>
                )
              })}
            </Box>
          ))}
        </>
      )}

      <div ref={listRef} />

      <Fab color="primary" sx={{ position: 'fixed', bottom: 80, right: 20, display: { md: 'none' } }}
        onClick={() => router.push(`/${prefix}/expenses/new`)}>
        <Add />
      </Fab>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('expense.deleteConfirm')}</DialogTitle>
        <DialogContent>
          <Typography>{t('expense.deleteConfirm')}</Typography>
          {deleteTarget && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {deleteTarget.description} — {deleteTarget.amount?.toFixed(2)} {deleteTarget.currency}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => handleDelete(deleteTarget.id)}>{t('common.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
