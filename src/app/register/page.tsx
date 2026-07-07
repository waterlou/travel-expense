'use client'
import { Container, Box, Typography, Button, Card, CardContent } from '@mui/material'
import { Google, TravelExplore } from '@mui/icons-material'
import { signIn } from 'next-auth/react'
import { useT } from '@/lib/i18n/LanguageContext'

export default function RegisterPage() {
  const { t } = useT()
  return (
    <Container maxWidth="xs">
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <TravelExplore sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>{t('auth.createAccount')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('auth.signUp')}
            </Typography>
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<Google />}
              onClick={() => signIn('google', { callbackUrl: '/' })}
            >
              {t('auth.signUpGoogle')}
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}
