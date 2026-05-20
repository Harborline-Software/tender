import { useEffect } from 'react';
import { ThemeProvider } from './theme/ThemeProvider';
import { TrayMenu } from './screens/TrayMenu';

function AppInner() {
  useEffect(() => {
    // Position panel in bottom-right corner when shown.
    // Real positioning via Tauri window API wired in M2.
    // For dev, panel renders inline in the browser.
  }, []);

  return <TrayMenu />;
}

export function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
