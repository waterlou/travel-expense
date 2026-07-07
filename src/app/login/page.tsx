'use client'
import { signIn } from 'next-auth/react'
import { Container, Box, Typography, Button, Card, CardContent, Divider } from '@mui/material'
import { Google, Apple, TravelExplore } from '@mui/icons-material'
import { useT } from '@/lib/i18n/LanguageContext'

export default function LoginPage() {
  const { t } = useT()
  return (
    <Container maxWidth="xs">
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <TravelExplore sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>{t('auth.signIn')}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3 }}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<Google />}
                onClick={() => signIn('google', { callbackUrl: '/' })}
              >
                {t('auth.signInGoogle')}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<Apple />}
                onClick={() => signIn('apple', { callbackUrl: '/' })}
              >
                {t('auth.signInApple')}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}
