'use client'
import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, CircularProgress, Alert } from '@mui/material'
import { Phone } from '@mui/icons-material'
import { getFirebaseAuth, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase'
import { signIn } from 'next-auth/react'

interface Props {
  open: boolean
  onClose: () => void
  callbackUrl?: string
}

export default function PhoneSignIn({ open, onClose, callbackUrl }: Props) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const recaptchaRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<any>(null)

  useEffect(() => {
    if (!open) {
      setStep('phone')
      setPhone('')
      setOtp('')
      setError('')
    }
  }, [open])

  async function sendOtp() {
    if (!phone.trim()) return
    setLoading(true)
    setError('')
    try {
      const auth = getFirebaseAuth()

      if (!recaptchaRef.current) return
      recaptchaRef.current.innerHTML = ''
      // Add a delay between renders
      await new Promise(r => setTimeout(r, 200))

      const verifier = new RecaptchaVerifier(auth, recaptchaRef.current, { size: 'invisible' })
      const confirmation = await signInWithPhoneNumber(auth, phone, verifier)
      confirmRef.current = confirmation
      setStep('otp')
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    if (!otp.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await confirmRef.current.confirm(otp)
      const idToken = await result.user.getIdToken()

      const res = await signIn('credentials', {
        id: 'phone',
        idToken,
        redirect: false,
        callbackUrl: callbackUrl || '/',
      })

      if (res?.error) throw new Error(res.error)
      onClose()
      window.location.href = callbackUrl || '/'
    } catch (e: any) {
      setError(e.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Sign in with Phone</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <div ref={recaptchaRef} />

        {step === 'phone' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Phone number"
              placeholder="+85291234567"
              fullWidth
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={loading}
            />
            <Button variant="contained" fullWidth onClick={sendOtp} disabled={loading || !phone.trim()}>
              {loading ? <CircularProgress size={20} /> : 'Send OTP'}
            </Button>
          </Box>
        )}

        {step === 'otp' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Enter the code sent to {phone}
            </Typography>
            <TextField
              label="6-digit code"
              fullWidth
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={loading}
              inputProps={{ maxLength: 6, style: { fontSize: 24, letterSpacing: 8, textAlign: 'center' } }}
            />
            <Button variant="contained" fullWidth onClick={verifyOtp} disabled={loading || otp.length < 6}>
              {loading ? <CircularProgress size={20} /> : 'Verify'}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
