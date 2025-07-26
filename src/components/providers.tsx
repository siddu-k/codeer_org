'use client';

import { CacheProvider } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles';
import { darkTheme } from '@/lib/mui-theme';
import createEmotionCache from '@/lib/emotion-cache';

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <CacheProvider value={clientSideEmotionCache}>
            <ThemeProvider theme={darkTheme}>
                {children}
            </ThemeProvider>
        </CacheProvider>
    );
}
