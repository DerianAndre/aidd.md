import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ThemeProvider } from './components/theme/theme-provider';
import { Toaster } from './components/ui/sonner';
import { useProjectStore } from './stores/project-store';

export function App() {
  const initialize = useProjectStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors />
    </ThemeProvider>
  );
}
