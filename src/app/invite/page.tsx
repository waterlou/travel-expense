'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { Container, Box, Typography, Button, Card, CardContent, CircularProgress, Alert, Chip } from '@mui/material'
import { TravelExplore, Google, Apple, Phone } from '@mui/icons-material'
import { SessionProvider } from 'next-auth/react'
import { useT } from '@/lib/i18n/LanguageContext'
import { appUrl } from '@/lib/utils'
import PhoneSignIn from '@/components/PhoneSignIn'

function InviteContent() {
  const { t } = useT()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [joining, setJoining] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [travelInfo, setTravelInfo] = useState<any>(null)
  const [selectedMember, setSelectedMember] = useState('')

  const code = searchParams.get('code') || ''

  // Step 1: on first load (authenticated + code), fetch invite info
  useEffect(() => {
    if (status === 'authenticated' && code && !travelInfo && !result && !joining) {
      fetchTravelInfo()
    }
  }, [status, code])

  async function fetchTravelInfo() {
    setJoining(true)
    setError('')
    try {
      const res = await fetch(appUrl('/api/invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid code')
      if (data.step === 'choose-member') {
        setTravelInfo(data)
        if (data.members.length === 0) {
          setError('No unclaimed member slots available for this travel.')
        }
      } else {
        // Already joined or direct assignment
        setResult(data)
        setTimeout(() => router.push(`/${data.prefix}`), 2000)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setJoining(false)
    }
  }

  // Step 2: user picks a member, claim it
  async function claimMember() {
    if (!selectedMember) return
    setJoining(true)
    setError('')
    try {
      const res = await fetch(appUrl('/api/invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, memberId: selectedMember }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to join')
      setResult(data)
      setTravelInfo(null)
      setTimeout(() => router.push(`/${data.prefix}`), 2000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setJoining(false)
    }
  }

  if (status === 'loading') {
    return <Box textAlign="center" py={8}><CircularProgress /></Box>
  }

  return (
    <Container maxWidth="sm">
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <TravelExplore sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>{t('invite.title')}</Typography>

            {!code && (
              <Typography color="text.secondary">{t('invite.noCode')}</Typography>
            )}

            {status === 'unauthenticated' && code && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {t('invite.signInToJoin')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button variant="contained" startIcon={<Google />}
                    onClick={() => signIn('google', { callbackUrl: `/invite?code=${code}` })}>
                    {t('auth.signInGoogle')}
                  </Button>
                  <Button variant="outlined" startIcon={<Apple />}
                    onClick={() => signIn('apple', { callbackUrl: `/invite?code=${code}` })}>
                    {t('auth.signInApple')}
                  </Button>
                  <Button variant="outlined" startIcon={<Phone />}
                    onClick={() => setPhoneOpen(true)}>
                    {t('auth.signInPhone')}
                  </Button>
                </Box>
              </Box>
            )}

            {status === 'authenticated' && code && joining && !travelInfo && (
              <Box sx={{ py: 2 }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography>{t('invite.joining')}</Typography>
              </Box>
            )}

            {travelInfo && !joining && (
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {travelInfo.travelName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Pick your name from this travel:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 3 }}>
                  {travelInfo.members.map((m: any) => (
                    <Chip
                      key={m.id}
                      label={m.name}
                      size="medium"
                      variant={selectedMember === m.id ? 'filled' : 'outlined'}
                      color={selectedMember === m.id ? 'primary' : 'default'}
                      onClick={() => setSelectedMember(m.id)}
                      sx={{ fontSize: '1rem', py: 2, px: 1 }}
                    />
                  ))}
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={!selectedMember}
                  onClick={claimMember}
                >
                  Join as {travelInfo.members.find((m: any) => m.id === selectedMember)?.name || '...'}
                </Button>
                {travelInfo.allowNew && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>— or —</Typography>
                    <Button variant="outlined" fullWidth onClick={() => {
                      setSelectedMember('__new__')
                      setJoining(true)
                      fetch(appUrl('/api/invite'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, newMember: true }),
                      }).then(r => r.json()).then(data => {
                        if (data.error) { setError(data.error); setJoining(false) }
                        else { setResult(data); setTravelInfo(null); setTimeout(() => router.push(`/${data.prefix}`), 2000) }
                      }).catch(() => { setError('Failed to join'); setJoining(false) })
                    }}>
                      Join as {session?.user?.name || 'new member'}
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {result && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {t('invite.joined')} {result.travelName}! {t('invite.redirecting')}
              </Alert>
            )}

            {error && !travelInfo && (
              <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
            )}

            {error && travelInfo && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>{error}</Alert>
            )}
          </CardContent>
        </Card>
      </Box>
      <PhoneSignIn open={phoneOpen} onClose={() => setPhoneOpen(false)} callbackUrl={`/invite?code=${code}`} />
    </Container>
  )
}

export default function Page() {
  const bp = typeof process !== 'undefined' ? process.env.BASE_PATH : ''
  return (
    <SessionProvider basePath={bp ? `${bp}/api/auth` : undefined}>
      <Suspense fallback={<Box textAlign="center" py={8}><CircularProgress /></Box>}>
        <InviteContent />
      </Suspense>
    </SessionProvider>
  )
}
