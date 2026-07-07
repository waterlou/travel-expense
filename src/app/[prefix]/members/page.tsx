'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Container, Typography, Box, Card, CardContent, List, ListItem,
  ListItemText, ListItemAvatar, Avatar, Chip, IconButton,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, TextField, Divider,
} from '@mui/material'
import { Person, ContentCopy, Share, Add, Edit, Delete, GroupWork } from '@mui/icons-material'

export default function MembersPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const prefix = params?.prefix as string
  const [travel, setTravel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [inviteDialog, setInviteDialog] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  // Groups state
  const [groups, setGroups] = useState<any[]>([])
  const [groupDialog, setGroupDialog] = useState<null | 'create' | any>(null)
  const [groupForm, setGroupForm] = useState({ name: '', memberIds: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadGroups() {
    const res = await fetch(`/api/travels/${prefix}/groups`)
    const data = await res.json()
    setGroups(data.groups || [])
  }

  useEffect(() => {
    fetch(`/api/travels/${prefix}`).then(r => r.json()).then(data => {
      setTravel(data.travel)
      setLoading(false)
    }).catch(() => setLoading(false))
    loadGroups()
  }, [prefix])

  const currentUser = travel?.members?.find((m: any) => m.userId === (session?.user as any)?.id)
  const isAdmin = currentUser?.isAdmin
  const members = travel?.members || []

  async function generateInvite() {
    const res = await fetch(`/api/travels/${prefix}/invites`, { method: 'POST' })
    const data = await res.json()
    if (data.code) {
      setInviteCode(data.code)
      setInviteLink(`${window.location.origin}/invite?code=${data.code}`)
    }
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
        ? `/api/travels/${prefix}/groups/${groupDialog.id}`
        : `/api/travels/${prefix}/groups`
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
      fetch(`/api/travels/${prefix}`).then(r => r.json()).then(d => {
        if (d.travel) setTravel(d.travel)
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleGroupDelete(gid: string) {
    await fetch(`/api/travels/${prefix}/groups/${gid}`, { method: 'DELETE' })
    loadGroups()
    fetch(`/api/travels/${prefix}`).then(r => r.json()).then(d => {
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
  if (!travel) return <Typography>Not found</Typography>

  return (
    <Container maxWidth="md" sx={{ mt: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Members</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => { generateInvite(); setInviteDialog(true) }}>
            Invite Member
          </Button>
        )}
      </Box>

      <Card sx={{ mb: 3 }}>
        <List>
          {members.map((member: any) => {
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
                  <Chip label="Admin" color="primary" size="small" />
                ) : (
                  <Chip label="Member" variant="outlined" size="small" />
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
              <Typography variant="h6">
                <GroupWork sx={{ mr: 0.5, verticalAlign: 'text-top' }} />
                Groups
              </Typography>
              <Button size="small" startIcon={<Add />} onClick={() => {
                setGroupForm({ name: '', memberIds: [] })
                setGroupDialog('create')
              }}>
                Create Group
              </Button>
            </Box>
            {groups.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No groups yet. Create groups to combine members as a single entity in the balance view.
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
        <DialogTitle>Invite Members</DialogTitle>
        <DialogContent>
          {!inviteCode ? (
            <Box textAlign="center" py={2}><CircularProgress /></Box>
          ) : (
            <Box>
              <Typography gutterBottom>Share this code with your travel companions:</Typography>
              <TextField fullWidth value={inviteCode} sx={{ mb: 2 }}
                InputProps={{ sx: { fontSize: 24, textAlign: 'center', letterSpacing: 4 } }} />
              <Typography gutterBottom>Or share this link:</Typography>
              <Box display="flex" gap={1}>
                <TextField fullWidth value={inviteLink} size="small" InputProps={{ readOnly: true }} />
                <Button variant="outlined" onClick={() => copyToClipboard(inviteLink)}
                  startIcon={copied ? undefined : <ContentCopy />}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </Box>
              <Box mt={2} display="flex" gap={1}>
                <Button variant="contained" startIcon={<Share />}
                  onClick={() => {
                    const text = `Join my travel "${travel.name}" on TravelExpense!\nCode: ${inviteCode}\nLink: ${inviteLink}`
                    if (navigator.share) { navigator.share({ text }) }
                    else { copyToClipboard(text) }
                  }}>
                  Share
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!groupDialog} onClose={() => setGroupDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{groupDialog === 'create' ? 'Create Group' : 'Edit Group'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField label="Group Name" fullWidth value={groupForm.name}
            onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} sx={{ mt: 1, mb: 2 }} />
          <Typography variant="body2" color="text.secondary" gutterBottom>Members:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {members.map((m: any) => (
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
          <Button onClick={() => setGroupDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleGroupSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
