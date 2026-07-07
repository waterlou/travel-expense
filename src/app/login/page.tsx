'use client'
import { signIn } from 'next-auth/react'
import { Container, Box, Typography, Button, Card, CardContent } from '@mui/material'
import { Google, TravelExplore } from '@mui/icons-material'

export default function LoginPage() {
  return (
    <Container maxWidth="xs">
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <TravelExplore sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>Sign In</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sign in to manage your travel expenses
            </Typography>
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<Google />}
              onClick={() => signIn('google', { callbackUrl: '/' })}
            >
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}
