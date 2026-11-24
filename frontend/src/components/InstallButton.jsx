import { useEffect, useState } from 'react';
import { showError, showSuccess } from '../utils/alerts';

function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsIOS(
      /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
    setInstalled(
      window.navigator.standalone === true ||
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    );

    function handleBeforeInstall(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }
    function handleInstalled() {
      setInstallPrompt(null);
      setInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleClick() {
    if (isIOS) {
      await showSuccess(
        'Tap the Share button, then choose “Add to Home Screen”.',
        'Install MeatLink'
      );
      return;
    }

    if (!installPrompt) {
      await showError(
        'Open your browser menu and choose “Install app” or “Add to Home Screen”.',
        'Install MeatLink'
      );
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <button className="btn btn-outline-light btn-small" onClick={handleClick}>
      ↓ Install
    </button>
  );
}

export default InstallButton;
