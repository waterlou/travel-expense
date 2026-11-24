'use client'
import { useState, useEffect } from 'react'

import {
  Card, CardContent, Typography, Box, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, CircularProgress, Alert,
} from '@mui/material'
import { ContentCopy } from '@mui/icons-material'
import { appUrl } from '@/lib/utils'
import { useT } from '@/lib/i18n/LanguageContext'
import { LOCALE_TAGS } from '@/lib/i18n/translations'

// User-level API key management (the key is scoped to the account, not to any
// single travel — it can create/list travels and manage all of them).
export default function ApiKeysCard() {
  const { t, locale } = useT()
  const [keys, setKeys] = useState<any[]>([])
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)
  const [revealKey, setRevealKey] = useState('')
  const [copiedSkills, setCopiedSkills] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

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

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>{t('apikeys.title')}</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('apikeys.desc')}
        </Typography>
        <Box mb={2} display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Typography variant="body2">{t('apikeys.skillsGuide')}</Typography>
          <code>{appUrl('/ai/SKILL.md')}</code>
          <Button size="small" variant="outlined"
            startIcon={copiedSkills ? undefined : <ContentCopy />}
            onClick={() => copyToClipboard(appUrl('/ai/SKILL.md'), setCopiedSkills)}>
            {copiedSkills ? t('common.copied') : t('common.copy')}
          </Button>
        </Box>
        {keys.map(k => (
          <Box key={k.id} display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
            <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 120 }}>{k.name}</Typography>
            <Typography variant="body2" component="code" sx={{ fontFamily: 'monospace' }}>{k.keyPrefix}&hellip;</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('common.created')} {new Date(k.createdAt).toLocaleDateString(LOCALE_TAGS[locale])}
              {k.lastUsedAt ? ` · ${t('common.lastUsed')} ${new Date(k.lastUsedAt).toLocaleDateString(LOCALE_TAGS[locale])}` : ''}
            </Typography>
            <Button size="small" color="error" onClick={() => handleRevoke(k.id)}>{t('common.revoke')}</Button>
          </Box>
        ))}
        <Button variant="contained" onClick={() => setCreateOpen(true)}>{t('apikeys.createKey')}</Button>
      </CardContent>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogTitle>{t('apikeys.createKey')}</DialogTitle>
        <DialogContent>
          <TextField label={t('common.name')} fullWidth value={createName} sx={{ mt: 1 }}
            onChange={e => setCreateName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreateKey} disabled={creating || !createName.trim()}>
            {creating ? <CircularProgress size={20} /> : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!revealKey} onClose={() => setRevealKey('')}>
        <DialogTitle>{t('apikeys.created')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('apikeys.shownOnce')}
          </Typography>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <code style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{revealKey}</code>
            <Button size="small" variant="outlined"
              startIcon={copiedKey ? undefined : <ContentCopy />}
              onClick={() => copyToClipboard(revealKey, setCopiedKey)}>
              {copiedKey ? t('common.copied') : t('common.copy')}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevealKey('')}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
