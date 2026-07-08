'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  Container, Grid, Card, CardContent, Typography, Box, List, ListItem,
  ListItemText, Chip, CircularProgress, Button, Fab,
} from '@mui/material'
import { Receipt, People, AccountBalance, CurrencyExchange, Add } from '@mui/icons-material'
import { useT } from '@/lib/i18n/LanguageContext'
import { appUrl } from '@/lib/utils'

export default function DashboardPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useT()
  const prefix = params?.prefix as string
  const [travel, setTravel] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(appUrl(`/api/travels/${prefix}`)).then(r => r.json()),
      fetch(appUrl(`/api/travels/${prefix}/expenses`)).then(r => r.json()),
    ]).then(([travelData, expenseData]) => {
      setTravel(travelData.travel)
      setExpenses(expenseData.expenses || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [prefix])

  if (loading) return <Box textAlign="center" py={4}><CircularProgress /></Box>
  if (!travel) return <Typography>{t('error.notFound')}</Typography>

  const currencies = [travel.mainCurrency, ...(JSON.parse(travel.currencies || '[]'))]
  const totalByCurrency: Record<string, number> = {}
  const confirmedExpenses = expenses.filter(e => e.confirmed)
  confirmedExpenses.forEach(e => {
    totalByCurrency[e.currency] = (totalByCurrency[e.currency] || 0) + e.amount
  })
  const totalExpenses = confirmedExpenses.length

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => router.push(`/${prefix}/expenses`)}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Receipt color="primary" />
                <Typography color="text.secondary">{t('misc.totalExpenses')}</Typography>
              </Box>
              <Typography variant="h4">{totalExpenses}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <People color="primary" />
                <Typography color="text.secondary">{t('member.members')}</Typography>
              </Box>
              <Typography variant="h4">{travel.members?.length || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CurrencyExchange color="primary" />
                <Typography color="text.secondary">Currencies</Typography>
              </Box>
              <Typography variant="h4">{currencies.length}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {currencies.map((c: string) => <Chip key={c} label={c} size="small" />)}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => router.push(`/${prefix}/balance`)}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <AccountBalance color="primary" />
                <Typography color="text.secondary">{t('balance.title')}</Typography>
              </Box>
              {Object.entries(totalByCurrency).map(([c, amt]) => (
                <Typography key={c} variant="body2">
                  {c}: {amt.toFixed(2)}
                </Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">{t('misc.recentExpenses')}</Typography>
                <Button size="small" variant="contained" startIcon={<Add />}
                  onClick={() => router.push(`/${prefix}/expenses/new`)}
                  sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
                  {t('expense.addExpense')}
                </Button>
              </Box>
              {expenses.length === 0 ? (
                <Typography color="text.secondary">{t('expense.noExpenses')}</Typography>
              ) : (
                <List>
                  {expenses.slice(0, 10).map((exp: any) => (
                    <ListItem key={exp.id} divider>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            {exp.description || t('misc.noDescription')}
                            {!exp.confirmed && <Chip label={t('expense.statusUnconfirmed')} size="small" color="warning" />}
                          </Box>
                        }
                        secondary={`${exp.date} · ${exp.paidBy?.name || t('misc.unknown')}`}
                      />
                      <Typography variant="body2" fontWeight="bold">
                        {exp.amount.toFixed(2)} {exp.currency}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Fab color="primary" sx={{ position: 'fixed', bottom: 80, right: 20, display: { md: 'none' } }}
        onClick={() => router.push(`/${prefix}/expenses/new`)}>
        <Add />
      </Fab>
    </Container>
  )
}
