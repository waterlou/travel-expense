'use client'
import { useState } from 'react'
import { Box, TextField, Popover, Button, Chip } from '@mui/material'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'

interface Props {
  startDate: Dayjs | null
  endDate: Dayjs | null
  onChange: (start: Dayjs | null, end: Dayjs | null) => void
}

export default function DateRangeSelector({ startDate, endDate, onChange }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [selecting, setSelecting] = useState(false)

  const displayText = startDate
    ? endDate
      ? `${startDate.format('MMM D, YYYY')} → ${endDate.format('MMM D, YYYY')}`
      : `${startDate.format('MMM D, YYYY')} → ?`
    : 'Select travel dates'

  function handleDayClick(day: Dayjs) {
    if (!selecting) {
      onChange(day, null)
      setSelecting(true)
    } else {
      if (day.isBefore(startDate!)) {
        onChange(day, startDate)
      } else {
        onChange(startDate, day)
      }
      setSelecting(false)
      setAnchorEl(null)
    }
  }

  function clear() {
    onChange(null, null)
    setSelecting(false)
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <TextField
        label="Travel dates"
        value={displayText}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        InputProps={{ readOnly: true }}
        fullWidth
        sx={{ cursor: 'pointer', '& input': { cursor: 'pointer' } }}
      />
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => { setAnchorEl(null); setSelecting(false) }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, maxWidth: 320 }}>
          {!selecting && (
            <Chip label="Click start date" color="primary" size="small" sx={{ mb: 1 }} />
          )}
          {selecting && (
            <Chip label="Click end date" color="secondary" size="small" sx={{ mb: 1 }} />
          )}
          <DateCalendar
            value={startDate}
            onChange={(newVal) => handleDayClick(newVal!)}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 1 }}>
            <Button size="small" onClick={clear}>Clear</Button>
            <Button size="small" variant="contained" onClick={() => { setAnchorEl(null); setSelecting(false) }}>
              Done
            </Button>
          </Box>
        </Box>
      </Popover>
    </LocalizationProvider>
  )
}
