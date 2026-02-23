import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

export default function NetworkStatus() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    // Check connection quality
    const checkConnection = async () => {
      if ('connection' in navigator) {
        const conn = navigator.connection;
        if (conn.effectiveType === '4g') {
          setConnectionQuality('good');
        } else if (conn.effectiveType === '3g') {
          setConnectionQuality('moderate');
        } else {
          setConnectionQuality('slow');
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkConnection();

    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', checkConnection);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', checkConnection);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-[100] ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-white text-sm font-medium">
              {isOnline ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                  <span>{t('network.back_online', 'Back online! Your data will sync automatically.')}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                  </svg>
                  <span>{t('network.offline', 'You are offline. Your complaint will be saved and submitted when connection is restored.')}</span>
                </>
              )}
              <button
                onClick={() => setShowBanner(false)}
                className="ml-4 p-1 hover:bg-white/20 rounded"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact network indicator
export function NetworkIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [quality, setQuality] = useState('good');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('connection' in navigator) {
      const updateQuality = () => {
        const conn = navigator.connection;
        if (conn.effectiveType === '4g') setQuality('good');
        else if (conn.effectiveType === '3g') setQuality('moderate');
        else setQuality('slow');
      };
      updateQuality();
      navigator.connection.addEventListener('change', updateQuality);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && quality === 'good') return null;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
      !isOnline 
        ? 'bg-red-100 text-red-700' 
        : quality === 'slow' 
          ? 'bg-orange-100 text-orange-700'
          : 'bg-yellow-100 text-yellow-700'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        !isOnline ? 'bg-red-500' : quality === 'slow' ? 'bg-orange-500' : 'bg-yellow-500'
      }`} />
      {!isOnline ? 'Offline' : quality === 'slow' ? 'Slow' : 'Weak'}
    </div>
  );
}
