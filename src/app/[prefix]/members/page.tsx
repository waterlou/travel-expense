'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Container, Typography, Box, Card, CardContent, List, ListItem,
  ListItemText, ListItemAvatar, Avatar, Chip, IconButton,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, TextField, Switch, FormControlLabel, Divider,
} from '@mui/material'
import { Person, ContentCopy, Share, Add, Edit, Delete, GroupWork } from '@mui/icons-material'
import { useT } from '@/lib/i18n/LanguageContext'
import { appUrl } from '@/lib/utils'

export default function MembersPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useT()
  const prefix = params?.prefix as string
  const [travel, setTravel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [inviteDialog, setInviteDialog] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteMulti, setInviteMulti] = useState(false)
  const [copied, setCopied] = useState(false)

  // Invites state
  const [invites, setInvites] = useState<any[]>([])
  async function loadInvites() {
    const res = await fetch(appUrl(`/api/travels/${prefix}/invites`))
    const data = await res.json()
    setInvites(data.invites || [])
  }

  // Groups state
  const [groups, setGroups] = useState<any[]>([])
  const [groupDialog, setGroupDialog] = useState<null | 'create' | any>(null)
  const [groupForm, setGroupForm] = useState({ name: '', memberIds: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadGroups() {
    const res = await fetch(appUrl(`/api/travels/${prefix}/groups`))
    const data = await res.json()
    setGroups(data.groups || [])
  }

  useEffect(() => {
    fetch(appUrl(`/api/travels/${prefix}`)).then(r => r.json()).then(data => {
      setTravel(data.travel)
      setLoading(false)
    }).catch(() => setLoading(false))
    loadGroups()
  }, [prefix])

  // Load invites separately (isAdmin isn't known until travel loads)
  useEffect(() => {
    if (travel) loadInvites()
  }, [travel])

  const currentUser = travel?.members?.find((m: any) => m.userId === (session?.user as any)?.id)
  const isAdmin = currentUser?.isAdmin
  const members = travel?.members || []

  async function generateInvite() {
    const res = await fetch(appUrl(`/api/travels/${prefix}/invites`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ multiUse: inviteMulti }),
    })
    const data = await res.json()
    if (data.code) {
      setInviteCode(data.code)
      setInviteLink(`${window.location.origin}/invite?code=${data.code}`)
    }
    loadInvites()
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleGroupSave() {
    if (!groupForm.name.trim()) return
    setSaving(true)
    setError('')
    try {
      const isEdit = groupDialog !== 'create'
      const url = isEdit
        ? appUrl(`/api/travels/${prefix}/groups/${groupDialog.id}`)
        : appUrl(`/api/travels/${prefix}/groups`)
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupForm.name, memberIds: groupForm.memberIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setGroupDialog(null)
      loadGroups()
      // Reload travel to get updated member groupIds
      fetch(appUrl(`/api/travels/${prefix}`)).then(r => r.json()).then(d => {
        if (d.travel) setTravel(d.travel)
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleGroupDelete(gid: string) {
    await fetch(appUrl(`/api/travels/${prefix}/groups/${gid}`), { method: 'DELETE' })
    loadGroups()
    fetch(appUrl(`/api/travels/${prefix}`)).then(r => r.json()).then(d => {
      if (d.travel) setTravel(d.travel)
    })
  }

  function openGroupEdit(group: any) {
    setGroupForm({
      name: group.name,
      memberIds: group.members?.map((m: any) => m.id) || [],
    })
    setGroupDialog(group)
  }

  function getMemberGroupName(memberId: string): string | null {
    for (const g of groups) {
      if (g.members?.some((m: any) => m.id === memberId)) return g.name
    }
    return null
  }

  if (loading) return <Box textAlign="center" py={4}><CircularProgress /></Box>
  if (!travel) return <Typography>{t('common.notFound')}</Typography>

  return (
    <Container maxWidth="md" sx={{ mt: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">{t('member.members')}</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => {
            setInviteCode('')
            setInviteLink('')
            setInviteMulti(false)
            setInviteDialog(true)
          }}>
            {t('member.invite')}
          </Button>
        )}
      </Box>

      <Card sx={{ mb: 3 }}>
        <List>
          {[...members].sort((a: any, b: any) => a.id.localeCompare(b.id)).map((member: any) => {
            const groupName = getMemberGroupName(member.id)
            return (
              <ListItem key={member.id} divider>
                <ListItemAvatar>
                  <Avatar><Person /></Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={member.name}
                  secondary={
                    <Box>
                      {member.user?.email || ''}
                      {groupName && (
                        <Chip icon={<GroupWork />} label={groupName} size="small" variant="outlined"
                          sx={{ ml: 1 }} />
                      )}
                    </Box>
                  }
                />
                {member.isAdmin ? (
                  <Chip label={t('member.admin')} color="primary" size="small" />
                ) : (
                  <Chip label={t('member.member')} variant="outlined" size="small" />
                )}
                {isAdmin && member.userId && !member.isAdmin && (
                  <IconButton size="small" sx={{ ml: 1 }} onClick={async () => {
                    await fetch(appUrl(`/api/travels/${prefix}/members/${member.id}/claim`), { method: 'DELETE' })
                    fetch(appUrl(`/api/travels/${prefix}`)).then(r => r.json()).then(d => {
                      if (d.travel) setTravel(d.travel)
                    })
                  }} title="Unlink user">
                    <Typography color="error" fontSize="14px">×</Typography>
                  </IconButton>
                )}
              </ListItem>
            )
          })}
        </List>
      </Card>

      {isAdmin && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Invitation Codes</Typography>
              <Button size="small" color="error" onClick={async () => {
                await fetch(appUrl(`/api/travels/${prefix}/invites/clean`), { method: 'DELETE' })
                loadInvites()
              }}>
                Clean inactive
              </Button>
            </Box>
            {invites.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No invitation codes created yet.
              </Typography>
            ) : (
              invites.map((inv: any) => (
                <Box key={inv.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: 2, minWidth: 100 }}>
                    {inv.code}
                  </Typography>
                  <Chip label={inv.multiUse ? 'Multi' : 'Once'} size="small" color={inv.multiUse ? 'info' : 'default'} variant="outlined" />
                  <Chip label={`${inv.usageCount} used`} size="small" variant="outlined" />
                  <Chip label={inv.active ? 'Active' : 'Inactive'} size="small" color={inv.active ? 'success' : 'default'} variant="outlined" />
                  <Switch size="small" checked={inv.active}
                    disabled={!inv.multiUse && inv.usageCount >= 1}
                    onChange={async () => {
                    await fetch(appUrl(`/api/travels/${prefix}/invites/${inv.id}`), {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ active: !inv.active }),
                    })
                    loadInvites()
                  }} />
                  <Typography variant="caption" color="text.secondary">
                    Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                  </Typography>
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                <GroupWork sx={{ mr: 0.5, verticalAlign: 'text-top' }} />
                {t('member.groups')}
              </Typography>
              <Button size="small" startIcon={<Add />} onClick={() => {
                setGroupForm({ name: '', memberIds: [] })
                setGroupDialog('create')
              }}>
                {t('member.createGroup')}
              </Button>
            </Box>
            {groups.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('member.noGroups')}
              </Typography>
            ) : (
              groups.map((g: any) => (
                <Box key={g.id} sx={{ mb: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="subtitle2">{g.name}</Typography>
                    <Box>
                      <IconButton size="small" onClick={() => openGroupEdit(g)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => handleGroupDelete(g.id)}><Delete fontSize="small" /></IconButton>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {g.members?.map((m: any) => <Chip key={m.id} label={m.name} size="small" />)}
                  </Box>
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('member.invite')}</DialogTitle>
        <DialogContent>
          {!inviteCode ? (
            <Box>
              <Typography gutterBottom>Choose code type:</Typography>
              <FormControlLabel
                control={<Switch checked={inviteMulti} onChange={e => setInviteMulti(e.target.checked)} />}
                label="Allow multiple uses (single use by default)"
                sx={{ mb: 2 }}
              />
              <Button variant="contained" fullWidth onClick={async () => {
                await generateInvite()
                setInviteDialog(true)
              }}>
                Generate Code
              </Button>
            </Box>
          ) : (
            <Box>
              <Typography gutterBottom>{t('member.shareCode')}</Typography>
              <TextField fullWidth value={inviteCode} sx={{ mb: 2 }}
                InputProps={{ sx: { fontSize: 24, textAlign: 'center', letterSpacing: 4 } }} />
              <Typography gutterBottom>{t('member.orLink')}</Typography>
              <Box display="flex" gap={1}>
                <TextField fullWidth value={inviteLink} size="small" InputProps={{ readOnly: true }} />
                <Button variant="outlined" onClick={() => copyToClipboard(inviteLink)}
                  startIcon={copied ? undefined : <ContentCopy />}>
                  {copied ? t('common.copied') : t('common.copy')}
                </Button>
              </Box>
              <Box mt={2} display="flex" gap={1}>
                <Button variant="contained" startIcon={<Share />}
                  onClick={() => {
                    const text = `Join my travel "${travel.name}" on TravelExpense!\nCode: ${inviteCode}\nLink: ${inviteLink}`
                    if (navigator.share) { navigator.share({ text }) }
                    else { copyToClipboard(text) }
                  }}>
                  {t('common.share')}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!groupDialog} onClose={() => setGroupDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{groupDialog === 'create' ? t('member.createGroup') : t('member.editGroup')}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField label={t('member.groupName')} fullWidth value={groupForm.name}
            onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} sx={{ mt: 1, mb: 2 }} />
          <Typography variant="body2" color="text.secondary" gutterBottom>{t('member.members')}:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {[...members].sort((a: any, b: any) => a.id.localeCompare(b.id)).map((m: any) => (
              <Chip key={m.id} label={m.name} size="small"
                variant={groupForm.memberIds.includes(m.id) ? 'filled' : 'outlined'}
                color={groupForm.memberIds.includes(m.id) ? 'primary' : 'default'}
                onClick={() => {
                  setGroupForm({
                    ...groupForm,
                    memberIds: groupForm.memberIds.includes(m.id)
                      ? groupForm.memberIds.filter((id: string) => id !== m.id)
                      : [...groupForm.memberIds, m.id],
                  })
                }} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialog(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleGroupSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
