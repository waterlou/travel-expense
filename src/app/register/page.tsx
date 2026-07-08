'use client'
import { useState, useEffect } from 'react'
import { signIn, getProviders, SessionProvider } from 'next-auth/react'
import { Container, Box, Typography, Button, Card, CardContent, Divider } from '@mui/material'
import { Google, Apple, Phone, TravelExplore } from '@mui/icons-material'
import { useT } from '@/lib/i18n/LanguageContext'
import PhoneSignIn from '@/components/PhoneSignIn'

function RegisterContent() {
  const { t } = useT()
  const bp = typeof process !== 'undefined' ? process.env.BASE_PATH : ''
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [providers, setProviders] = useState<any>(null)

  useEffect(() => {
    getProviders().then(setProviders)
  }, [])

  const hasApple = !!providers?.apple
  const hasPhone = !!providers?.phone

  return (
    <Container maxWidth="xs">
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <TravelExplore sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>{t('auth.createAccount')}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3 }}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<Google />}
                onClick={() => signIn('google', { callbackUrl: bp || '/' })}
              >
                {t('auth.signUpGoogle')}
              </Button>
              {hasApple && (
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  startIcon={<Apple />}
                  onClick={() => signIn('apple', { callbackUrl: bp || '/' })}
                >
                  {t('auth.signUpApple')}
                </Button>
              )}
              {(hasApple && hasPhone) || (hasPhone && !hasApple) ? <Divider>or</Divider> : null}
              {hasPhone && (
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  startIcon={<Phone />}
                  onClick={() => setPhoneOpen(true)}
                >
                  {t('auth.signInPhone')}
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
      <PhoneSignIn open={phoneOpen} onClose={() => setPhoneOpen(false)} callbackUrl={bp || '/'} />
    </Container>
  )
}

export default function RegisterPage() {
  const bp = typeof process !== 'undefined' ? process.env.BASE_PATH : ''
  return (
    <SessionProvider basePath={bp ? `${bp}/api/auth` : undefined}>
      <RegisterContent />
    </SessionProvider>
  )
}
