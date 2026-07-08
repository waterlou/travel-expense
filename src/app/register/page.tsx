'use client'
import { useState } from 'react'
import { Container, Box, Typography, Button, Card, CardContent, Divider } from '@mui/material'
import { Google, Apple, Phone, TravelExplore } from '@mui/icons-material'
import { signIn } from 'next-auth/react'
import { useT } from '@/lib/i18n/LanguageContext'
import PhoneSignIn from '@/components/PhoneSignIn'

export default function RegisterPage() {
  const { t } = useT()
  const bp = typeof process !== 'undefined' ? process.env.BASE_PATH : ''
  const [phoneOpen, setPhoneOpen] = useState(false)

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
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<Apple />}
                onClick={() => signIn('apple', { callbackUrl: bp || '/' })}
              >
                {t('auth.signUpApple')}
              </Button>
              <Divider>or</Divider>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<Phone />}
                onClick={() => setPhoneOpen(true)}
              >
                {t('auth.signInPhone')}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
      <PhoneSignIn open={phoneOpen} onClose={() => setPhoneOpen(false)} callbackUrl={bp || '/'} />
    </Container>
  )
}
