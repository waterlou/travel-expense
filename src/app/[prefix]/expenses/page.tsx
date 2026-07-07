'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Container, Typography, Box, Card, CardContent, List, ListItem,
  ListItemText, Chip, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, CircularProgress,
  Fab, ImageList, ImageListItem, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material'
import { Add, Edit, Delete, Image } from '@mui/icons-material'

export default function ExpensesPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const prefix = params?.prefix as string
  const [travel, setTravel] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [currencyFilter, setCurrencyFilter] = useState('all')
  const [confirmedFilter, setConfirmedFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      fetch(`/api/travels/${prefix}`).then(r => r.json()),
      fetch(`/api/travels/${prefix}/expenses`).then(r => r.json()),
    ]).then(([t, e]) => {
      setTravel(t.travel)
      setExpenses(e.expenses || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [prefix])

  async function handleDelete(id: string) {
    await fetch(`/api/travels/${prefix}/expenses/${id}`, { method: 'DELETE' })
    setExpenses(expenses.filter(e => e.id !== id))
    setDeleteTarget(null)
  }

  if (loading) return <Box textAlign="center" py={4}><CircularProgress /></Box>
  if (!travel) return <Typography>Not found</Typography>

  const currentUser = travel.members?.find((m: any) => m.userId === (session?.user as any)?.id)
  const isAdmin = currentUser?.isAdmin
  const permission = travel.expensePermission

  let filtered = expenses
  if (currencyFilter !== 'all') filtered = filtered.filter(e => e.currency === currencyFilter)
  if (confirmedFilter === 'confirmed') filtered = filtered.filter(e => e.confirmed)
  if (confirmedFilter === 'unconfirmed') filtered = filtered.filter(e => !e.confirmed)

  const currencies = [travel.mainCurrency, ...(JSON.parse(travel.currencies || '[]'))]

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5">Expenses</Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Currency</InputLabel>
            <Select value={currencyFilter} label="Currency" onChange={e => setCurrencyFilter(e.target.value)}>
              <MenuItem value="all">All</MenuItem>
              {currencies.map((c: string) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select value={confirmedFilter} label="Status" onChange={e => setConfirmedFilter(e.target.value)}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="unconfirmed">Unconfirmed</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Add />} onClick={() => router.push(`/${prefix}/expenses/new`)}>
            Add Expense
          </Button>
        </Box>
      </Box>

      {filtered.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No expenses found</Typography>
          </CardContent>
        </Card>
      ) : (
        <List>
          {filtered.map((exp: any) => {
            const isCreator = exp.paidById === currentUser?.id
            const canEdit = isAdmin || (permission >= 3 && isCreator) || permission >= 4
            const canDel = isAdmin || (permission >= 3 && isCreator) || permission >= 4

            return (
              <Card key={exp.id} sx={{ mb: 1 }}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography>{exp.description || 'No description'}</Typography>
                        {!exp.confirmed && <Chip label="Unconfirmed" size="small" color="warning" variant="outlined" />}
                        {exp.imageUrl && <Image fontSize="small" color="action" />}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {exp.date} · {exp.paidBy?.name || 'Unknown'} paid
                        </Typography>
                        {exp.splits?.map((s: any) => (
                          <Chip key={s.id} size="small" label={`${s.member?.name}: ${s.amount?.toFixed(2) || 'equal'}`}
                            variant="outlined" sx={{ mr: 0.5, mt: 0.5 }} />
                        ))}
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
                    <img src={exp.imageUrl} alt="Expense" style={{ maxHeight: 150, borderRadius: 4 }} />
                  </Box>
                )}
              </Card>
            )
          })}
        </List>
      )}

      <Fab color="primary" sx={{ position: 'fixed', bottom: 80, right: 20, display: { md: 'none' } }}
        onClick={() => router.push(`/${prefix}/expenses/new`)}>
        <Add />
      </Fab>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Expense?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this expense?</Typography>
          {deleteTarget && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {deleteTarget.description} — {deleteTarget.amount?.toFixed(2)} {deleteTarget.currency}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => handleDelete(deleteTarget.id)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
