import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentLocation, formatCoordinates } from '../utils/geolocation';
import { complaintApi } from '../services/api';

export default function LocationCapture({ onLocationCapture, onAddressCapture, onError }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('idle'); // idle, acquiring, success, error
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const captureLocation = async () => {
    setStatus('acquiring');
    setErrorMessage(null);

    try {
      const loc = await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      });

      setLocation(loc);
      setStatus('success');
      onLocationCapture?.(loc);

      // Now get the address
      try {
        const result = await complaintApi.reverseGeocode(loc.latitude, loc.longitude);
        if (result.success) {
          setAddress(result.formattedAddress || result.address?.fullAddress);
          onAddressCapture?.(result.address, result.formattedAddress);
        }
      } catch (geocodeError) {
        console.error('Geocoding error:', geocodeError);
        // Don't fail the whole process if geocoding fails
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error.message);
      onError?.(error.message);
    }
  };

  // Auto-capture on mount
  useEffect(() => {
    captureLocation();
  }, []);

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      {/* Status indicator */}
      <div className="flex items-center gap-3 mb-3">
        {status === 'acquiring' && (
          <>
            <div className="spinner w-5 h-5" />
            <span className="text-gray-600">{t('gps_acquiring')}</span>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-green-600 font-medium">{t('gps_success')}</span>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span className="text-red-600 font-medium">{t('gps_error')}</span>
          </>
        )}
      </div>

      {/* Location details */}
      {location && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <p className="text-gray-700 font-mono text-xs">
                {formatCoordinates(location.latitude, location.longitude)}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                {t('gps_accuracy')}: ±{Math.round(location.accuracy)} {t('gps_meters')}
              </p>
            </div>
          </div>

          {address && (
            <div className="flex items-start gap-2 text-sm mt-2 pt-2 border-t border-gray-200">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-gray-700 text-sm">{address}</p>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="mt-3">
          <p className="text-sm text-red-600 mb-3">{errorMessage}</p>
          <button
            onClick={captureLocation}
            className="btn-primary text-sm py-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
        </div>
      )}

      {/* Refresh button (when successful) */}
      {status === 'success' && (
        <button
          onClick={captureLocation}
          className="mt-3 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Location
        </button>
      )}
    </div>
  );
}
