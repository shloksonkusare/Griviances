import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export function GPSAccuracyIndicator({ accuracy, isLoading }) {
  const { t } = useTranslation();

  const getAccuracyLevel = (meters) => {
    if (!meters) return { level: 'unknown', color: 'gray', label: 'detecting' };
    if (meters <= 10) return { level: 'excellent', color: 'green', label: 'excellent' };
    if (meters <= 30) return { level: 'good', color: 'blue', label: 'good' };
    if (meters <= 100) return { level: 'moderate', color: 'yellow', label: 'moderate' };
    return { level: 'poor', color: 'red', label: 'poor' };
  };

  const { level, color, label } = getAccuracyLevel(accuracy);

  const colorClasses = {
    green: 'bg-green-100 text-green-700 border-green-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const dotColors = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${colorClasses[color]}`}>
      {isLoading ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
          <span>{t('gps.detecting', 'Detecting...')}</span>
        </>
      ) : (
        <>
          <span className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
          <span>{t(`gps.${label}`, label)}</span>
          {accuracy && (
            <span className="text-xs opacity-75">±{Math.round(accuracy)}m</span>
          )}
        </>
      )}
    </div>
  );
}

export function CameraReadinessIndicator({ isReady, hasPermission, error }) {
  const { t } = useTranslation();

  const getStatus = () => {
    if (error) return { color: 'red', icon: '❌', label: 'error' };
    if (!hasPermission) return { color: 'yellow', icon: '⚠️', label: 'permission_needed' };
    if (isReady) return { color: 'green', icon: '✅', label: 'ready' };
    return { color: 'gray', icon: '⏳', label: 'initializing' };
  };

  const { color, icon, label } = getStatus();

  const colorClasses = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${colorClasses[color]}`}>
      <span>{icon}</span>
      <span>{t(`camera.${label}`, label)}</span>
    </div>
  );
}

export function SystemStatusBar({ gpsAccuracy, gpsLoading, cameraReady, cameraPermission, isOnline }) {
  const { t } = useTranslation();

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-2">
      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-3">
          {/* Network Status */}
          <div className={`flex items-center gap-1.5 text-xs font-medium ${
            isOnline ? 'text-green-600' : 'text-red-600'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            {isOnline ? t('status.online', 'Online') : t('status.offline', 'Offline')}
          </div>

          {/* GPS Status */}
          <GPSAccuracyIndicator accuracy={gpsAccuracy} isLoading={gpsLoading} />

          {/* Camera Status */}
          <CameraReadinessIndicator isReady={cameraReady} hasPermission={cameraPermission} />
        </div>
      </div>
    </div>
  );
}

export function ValidationChecklist({ items }) {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
      {items.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-3"
        >
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
            item.valid ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
          }`}>
            {item.valid ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="w-2 h-2 rounded-full bg-gray-400" />
            )}
          </div>
          <span className={`text-sm ${item.valid ? 'text-gray-900' : 'text-gray-500'}`}>
            {t(item.labelKey, item.label)}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

export default function StatusIndicators() {
  return null;
}
