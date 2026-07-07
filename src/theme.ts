'use client'
import { createTheme, ThemeOptions } from '@mui/material/styles'

const light: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: { main: '#E85D75', light: '#FF8A9E', dark: '#C4455C' },
    secondary: { main: '#48DBFB', light: '#7BE6FF', dark: '#2BC0E0' },
    success: { main: '#6BCB77' },
    warning: { main: '#F9CA24' },
    background: { default: '#FFF8F0', paper: '#FFFFFF' },
    text: { primary: '#2D3436', secondary: '#636E72' },
    divider: '#F0E8E0',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [
      'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"',
      'Roboto', 'sans-serif',
    ].join(','),
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600, fontSize: '0.95rem' },
    button: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.2s, transform 0.2s',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          padding: '8px 22px',
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 4px 14px rgba(232, 93, 117, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(232, 93, 117, 0.4)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(255, 248, 240, 0.8)',
          color: '#2D3436',
          boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(255, 248, 240, 0.9)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            color: '#E85D75',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(232, 93, 117, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(232, 93, 117, 0.15)',
            },
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 700,
            backgroundColor: '#FFF8F0',
          },
        },
      },
    },
  },
}

const dark: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: { main: '#FF6B81', light: '#FF94A8', dark: '#E0556B' },
    secondary: { main: '#54E0FF', light: '#80EAFF', dark: '#30C8E8' },
    success: { main: '#6BCB77' },
    warning: { main: '#F9CA24' },
    background: { default: '#0D1117', paper: '#161B22' },
    text: { primary: '#EAEAEA', secondary: '#9CA3AF' },
    divider: '#252D3A',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [
      'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"',
      'Roboto', 'sans-serif',
    ].join(','),
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600, fontSize: '0.95rem' },
    button: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          transition: 'box-shadow 0.2s, transform 0.2s',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          padding: '8px 22px',
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 4px 14px rgba(255, 107, 129, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(255, 107, 129, 0.4)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(13, 17, 23, 0.85)',
          color: '#EAEAEA',
          boxShadow: '0 1px 8px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '2px 0 12px rgba(0,0,0,0.2)',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(13, 17, 23, 0.9)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            color: '#FF6B81',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 107, 129, 0.15)',
            '&:hover': {
              backgroundColor: 'rgba(255, 107, 129, 0.2)',
            },
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 700,
            backgroundColor: '#161B22',
          },
        },
      },
    },
  },
}

export function getTheme(mode: 'light' | 'dark') {
  return createTheme(mode === 'dark' ? dark : light)
}
