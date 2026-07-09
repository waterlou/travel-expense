'use client'
import { useState, useEffect } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { SessionProvider, useSession } from 'next-auth/react'
import {
  Box, AppBar, Toolbar, Typography, Drawer, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton,
  CircularProgress, BottomNavigation, BottomNavigationAction,
  Paper, Divider, Avatar, Menu, MenuItem,
} from '@mui/material'
import {
  Dashboard, Receipt, People, AccountBalance,
  Settings, Menu as MenuIcon, TravelExplore,
  Logout, Person, Home, ArrowBack,
  DarkMode, LightMode,
} from '@mui/icons-material'
import { signOut } from 'next-auth/react'
import { useThemeMode } from '@/lib/ThemeContext'
import { useT } from '@/lib/i18n/LanguageContext'
import { appUrl } from '@/lib/utils'

function TravelLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [travel, setTravel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { mode, toggleTheme } = useThemeMode()
  const { t } = useT()
  const bp = typeof process !== 'undefined' ? process.env.BASE_PATH : ''
  const prefix = params?.prefix as string

  const navItems = [
    { label: t('nav.dashboard'), icon: <Dashboard />, path: '' },
    { label: t('nav.expenses'), icon: <Receipt />, path: '/expenses' },
    { label: t('nav.members'), icon: <People />, path: '/members' },
    { label: t('nav.balance'), icon: <AccountBalance />, path: '/balance' },
    { label: t('nav.settings'), icon: <Settings />, path: '/settings' },
  ]

  useEffect(() => {
    if (!prefix) return
    fetch(appUrl(`/api/travels/${prefix}`))
      .then(r => r.json())
      .then(data => {
        if (data.travel) setTravel(data.travel)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [prefix])

  const currentPath = pathname.replace(`/${prefix}`, '') || '/'

  function getActiveTab() {
    if (currentPath.startsWith('/expenses')) return '/expenses'
    if (currentPath.startsWith('/members')) return '/members'
    if (currentPath.startsWith('/balance')) return '/balance'
    if (currentPath.startsWith('/settings')) return '/settings'
    return ''
  }

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box>
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <TravelExplore sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="subtitle1" noWrap>{travel?.name || 'Travel'}</Typography>
        </Box>
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => { router.push('/'); setMobileOpen(false) }}>
              <ListItemIcon><Home /></ListItemIcon>
              <ListItemText primary={t('nav.allTravels')} />
            </ListItemButton>
          </ListItem>
          <Divider sx={{ my: 0.5 }} />
          {navItems.map(item => (
            <ListItem key={item.label} disablePadding>
              <ListItemButton
                selected={getActiveTab() === item.path}
                onClick={() => { router.push(`/${prefix}${item.path}`); setMobileOpen(false) }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
        <IconButton onClick={toggleTheme} size="small">
          {mode === 'dark' ? <LightMode /> : <DarkMode />}
        </IconButton>
      </Box>
    </Box>
  )

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  if (!travel) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h5" color="text.secondary">{t('error.notFound')}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" sx={{ mr: 2, display: { md: 'none' } }}
            onClick={() => setMobileOpen(!mobileOpen)}>
            <MenuIcon />
          </IconButton>
          <IconButton color="inherit" sx={{ mr: 1 }} onClick={() => router.push('/')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {travel.name}
          </Typography>
          <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {session?.user?.name?.[0] || '?'}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>
              <Person sx={{ mr: 1 }} /> {session?.user?.email}
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => signOut({ callbackUrl: bp || '/' })}>
              <Logout sx={{ mr: 1 }} /> {t('nav.signOut')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: 240 },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, pb: { xs: 7, md: 0 } }}>
        <Toolbar />
        {children}
      </Box>

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, display: { md: 'none' } }} elevation={3}>
        <BottomNavigation
          value={getActiveTab()}
          onChange={(_, newValue) => router.push(`/${prefix}${newValue}`)}
          showLabels
        >
          {navItems.map(item => (
            <BottomNavigationAction key={item.label} label={item.label} icon={item.icon} value={item.path} />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const bp = typeof process !== 'undefined' ? process.env.BASE_PATH : ''
  return (
    <SessionProvider basePath={bp ? `${bp}/api/auth` : undefined}>
      <TravelLayout>{children}</TravelLayout>
    </SessionProvider>
  )
}
