import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa_dismissed') === 'true');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="bg-primary text-primary-foreground px-3 py-2 flex items-center justify-between text-xs">
      <span>📱 Add KisanMitra to your home screen for offline access</span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={handleInstall} className="text-xs h-7">Install</Button>
        <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-xs h-7 text-primary-foreground/80">Not Now</Button>
      </div>
    </div>
  );
}
