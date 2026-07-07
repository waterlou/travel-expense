'use client'
import { Container, Box, Typography, Button, Card, CardContent } from '@mui/material'
import { Google, TravelExplore } from '@mui/icons-material'
import { signIn } from 'next-auth/react'

export default function RegisterPage() {
  return (
    <Container maxWidth="xs">
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <TravelExplore sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>Create Account</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sign up to start tracking travel expenses
            </Typography>
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<Google />}
              onClick={() => signIn('google', { callbackUrl: '/' })}
            >
              Sign up with Google
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}
