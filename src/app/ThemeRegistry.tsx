'use client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { getTheme } from '@/theme'
import { ThemeModeProvider, useThemeMode } from '@/lib/ThemeContext'

function ThemedApp({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode()
  const theme = getTheme(mode)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <ThemeModeProvider>
      <ThemedApp>
        {children}
      </ThemedApp>
    </ThemeModeProvider>
  )
}
