'use client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { getTheme } from '@/theme'
import { ThemeModeProvider, useThemeMode } from '@/lib/ThemeContext'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

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
      <LanguageProvider>
        <ThemedApp>
          {children}
        </ThemedApp>
      </LanguageProvider>
    </ThemeModeProvider>
  )
}
