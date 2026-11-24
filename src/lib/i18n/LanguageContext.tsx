'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import translations, { Locale, LOCALE_LABELS } from './translations'

type LangContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  LOCALE_LABELS: Record<Locale, string>
}

const LangContext = createContext<LangContextValue>(null!)

function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language
  if (lang.startsWith('zh-CN') || lang.startsWith('zh-Hans')) return 'zhCN'
  if (lang.startsWith('zh-TW') || lang.startsWith('zh-Hant') || lang === 'zh') return 'zhTW'
  if (lang.startsWith('ja')) return 'ja'
  if (lang.startsWith('es')) return 'es'
  if (lang.startsWith('de')) return 'de'
  if (lang.startsWith('fr')) return 'fr'
  return 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const stored = localStorage.getItem('locale') as Locale | null
    if (stored && stored in LOCALE_LABELS) {
      setLocaleState(stored)
    } else {
      setLocaleState(detectLocale())
    }
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('locale', l)
  }, [])

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let s = translations[locale]?.[key] ?? translations.en?.[key] ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
    return s
  }, [locale])

  return (
    <LangContext.Provider value={{ locale, setLocale, t, LOCALE_LABELS }}>
      {children}
    </LangContext.Provider>
  )
}

export function useT() {
  return useContext(LangContext)
}
