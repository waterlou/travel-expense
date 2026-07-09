'use client'
import { useState } from 'react'
import { Dialog, IconButton, Box, Typography } from '@mui/material'
import { Close } from '@mui/icons-material'

interface Props {
  open: boolean
  src: string
  alt?: string
  onClose: () => void
}

export default function ImageLightbox({ open, src, alt, onClose }: Props) {
  const [error, setError] = useState(false)

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false}
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.85)' } },
        paper: { sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible' } },
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <IconButton onClick={onClose}
          sx={{ position: 'absolute', top: -40, right: -40, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
          <Close />
        </IconButton>
        {error ? (
          <Typography sx={{ color: 'white', textAlign: 'center', py: 8, px: 4 }}>
            Failed to load image
          </Typography>
        ) : (
          <Box
            component="img"
            src={src}
            alt={alt || 'Image'}
            onError={() => setError(true)}
            sx={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 1, objectFit: 'contain' }}
          />
        )}
      </Box>
    </Dialog>
  )
}
