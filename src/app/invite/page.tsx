'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { Container, Box, Typography, Button, Card, CardContent, CircularProgress, Alert } from '@mui/material'
import { TravelExplore, Google, Apple } from '@mui/icons-material'
import { SessionProvider } from 'next-auth/react'
import { useT } from '@/lib/i18n/LanguageContext'

function InviteContent() {
  const { t } = useT()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [joining, setJoining] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const code = searchParams.get('code') || ''

  useEffect(() => {
    if (status === 'authenticated' && code && !joining && !result) {
      joinTravel()
    }
  }, [status, code])

  async function joinTravel() {
    setJoining(true)
    setError('')
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to join')
      setResult(data)
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
                </Box>
              </Box>
            )}

            {status === 'authenticated' && code && joining && (
              <Box>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography>{t('invite.joining')}</Typography>
              </Box>
            )}

            {result && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {t('invite.joined')} {result.travelName}! {t('invite.redirecting')}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
            )}
          </CardContent>
        </Card>
      </Box>
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
