import { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  WifiIcon, 
  SignalIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

// Context for connectivity state
const ConnectivityContext = createContext({
  isOnline: true,
  connectionQuality: 'good',
  gpsAccuracy: null,
  gpsStatus: 'idle',
});

export function ConnectivityProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle, acquiring, success, error

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection quality using Network Information API
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const updateConnectionQuality = () => {
        const effectiveType = connection.effectiveType;
        if (effectiveType === '4g') {
          setConnectionQuality('excellent');
        } else if (effectiveType === '3g') {
          setConnectionQuality('good');
        } else if (effectiveType === '2g') {
          setConnectionQuality('poor');
        } else {
          setConnectionQuality('very-poor');
        }
      };
      
      updateConnectionQuality();
      connection.addEventListener('change', updateConnectionQuality);
      
      return () => {
        connection.removeEventListener('change', updateConnectionQuality);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value = {
    isOnline,
    connectionQuality,
    gpsAccuracy,
    setGpsAccuracy,
    gpsStatus,
    setGpsStatus,
  };

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  return useContext(ConnectivityContext);
}

// Status indicator component
export function StatusIndicators({ showGPS = true, className = '' }) {
  const { t } = useTranslation();
  const { isOnline, connectionQuality, gpsAccuracy, gpsStatus } = useConnectivity();

  const getConnectionIcon = () => {
    if (!isOnline) {
      return <XCircleIcon className="w-4 h-4 text-red-500" />;
    }
    return <WifiIcon className={`w-4 h-4 ${
      connectionQuality === 'excellent' ? 'text-green-500' :
      connectionQuality === 'good' ? 'text-green-400' :
      connectionQuality === 'poor' ? 'text-yellow-500' :
      'text-red-500'
    }`} />;
  };

  const getConnectionText = () => {
    if (!isOnline) return t('offline');
    return connectionQuality === 'excellent' ? t('excellent') :
           connectionQuality === 'good' ? t('good') :
           connectionQuality === 'poor' ? t('poor') :
           t('weak');
  };

  const getGPSIcon = () => {
    switch (gpsStatus) {
      case 'success':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      case 'acquiring':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <SignalIcon className="w-4 h-4 text-blue-500" />
          </motion.div>
        );
      default:
        return <SignalIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getGPSText = () => {
    switch (gpsStatus) {
      case 'success':
        return gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : t('gps_ready');
      case 'error':
        return t('gps_error');
      case 'acquiring':
        return t('acquiring_gps');
      default:
        return t('gps_idle');
    }
  };

  const getAccuracyColor = () => {
    if (!gpsAccuracy) return 'text-gray-500';
    if (gpsAccuracy <= 10) return 'text-green-500';
    if (gpsAccuracy <= 50) return 'text-yellow-500';
    return 'text-orange-500';
  };

  return (
    <div className={`flex items-center gap-4 text-xs ${className}`}>
      {/* Network Status */}
      <div className="flex items-center gap-1.5">
        {getConnectionIcon()}
        <span className={`${!isOnline ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
          {getConnectionText()}
        </span>
      </div>

      {/* GPS Status */}
      {showGPS && (
        <div className="flex items-center gap-1.5">
          {getGPSIcon()}
          <span className={getAccuracyColor()}>
            {getGPSText()}
          </span>
        </div>
      )}
    </div>
  );
}

// Offline Banner
export function OfflineBanner() {
  const { t } = useTranslation();
  const { isOnline } = useConnectivity();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-yellow-50 border-b border-yellow-200"
        >
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-yellow-800">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              <span className="font-medium">{t('you_are_offline')}</span>
              <span className="hidden sm:inline">— {t('offline_message')}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// GPS Accuracy Indicator
export function GPSAccuracyIndicator({ accuracy, className = '' }) {
  const { t } = useTranslation();
  
  if (!accuracy) return null;

  const getAccuracyLevel = () => {
    if (accuracy <= 5) return { level: 'excellent', color: 'green', bars: 4 };
    if (accuracy <= 15) return { level: 'good', color: 'green', bars: 3 };
    if (accuracy <= 50) return { level: 'fair', color: 'yellow', bars: 2 };
    return { level: 'poor', color: 'red', bars: 1 };
  };

  const { level, color, bars } = getAccuracyLevel();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-1 rounded-sm transition-colors ${
              bar <= bars
                ? color === 'green' ? 'bg-green-500' :
                  color === 'yellow' ? 'bg-yellow-500' :
                  'bg-red-500'
                : 'bg-gray-200'
            }`}
            style={{ height: `${bar * 25}%` }}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${
        color === 'green' ? 'text-green-600' :
        color === 'yellow' ? 'text-yellow-600' :
        'text-red-600'
      }`}>
        ±{Math.round(accuracy)}m ({t(`accuracy_${level}`)})
      </span>
    </div>
  );
}
