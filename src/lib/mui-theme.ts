import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#ffffff',
        },
        secondary: {
            main: '#64748b',
        },
        background: {
            default: '#000000',
            paper: '#0f172a',
        },
        text: {
            primary: '#ffffff',
            secondary: '#94a3b8',
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: '0.5rem',
                },
            },
        },
    },
});
