'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Container, Typography, Box, Card, CardContent, List, ListItem,
  ListItemText, ListItemAvatar, Avatar, Chip, IconButton,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, TextField,
} from '@mui/material'
import { Person, ContentCopy, Share, Delete, Add } from '@mui/icons-material'

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

  useEffect(() => {
    fetch(`/api/travels/${prefix}`).then(r => r.json()).then(data => {
      setTravel(data.travel)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [prefix])

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

  if (loading) return <Box textAlign="center" py={4}><CircularProgress /></Box>
  if (!travel) return <Typography>Not found</Typography>

  const currentUser = travel.members?.find((m: any) => m.userId === (session?.user as any)?.id)
  const isAdmin = currentUser?.isAdmin

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

      <Card>
        <List>
          {travel.members?.map((member: any) => (
            <ListItem key={member.id} divider>
              <ListItemAvatar>
                <Avatar>
                  <Person />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={member.name}
                secondary={member.user?.email || ''}
              />
              {member.isAdmin ? (
                <Chip label="Admin" color="primary" size="small" />
              ) : (
                <Chip label="Member" variant="outlined" size="small" />
              )}
            </ListItem>
          ))}
        </List>
      </Card>

      <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Members</DialogTitle>
        <DialogContent>
          {!inviteCode ? (
            <Box textAlign="center" py={2}>
              <CircularProgress />
            </Box>
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
                    if (navigator.share) {
                      navigator.share({ text })
                    } else {
                      copyToClipboard(text)
                    }
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
    </Container>
  )
}
