/**
 * Get current GPS location
 * @param {Object} options - Geolocation options
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number, timestamp: Date}>}
 */
export function getCurrentLocation(options = {}) {
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 0,
  };

  const geolocationOptions = { ...defaultOptions, ...options };

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: new Date(position.timestamp),
        });
      },
      (error) => {
        let errorMessage;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your device settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please ensure you have GPS enabled and try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred while getting location.';
        }
        reject(new Error(errorMessage));
      },
      geolocationOptions
    );
  });
}

/**
 * Watch location changes
 * @param {Function} onSuccess - Callback for successful location updates
 * @param {Function} onError - Callback for errors
 * @param {Object} options - Geolocation options
 * @returns {number} - Watch ID to clear later
 */
export function watchLocation(onSuccess, onError, options = {}) {
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 0,
  };

  const geolocationOptions = { ...defaultOptions, ...options };

  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported by this browser'));
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp),
      });
    },
    (error) => {
      let errorMessage;
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location permission denied';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location unavailable';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out';
          break;
        default:
          errorMessage = 'Unknown location error';
      }
      onError(new Error(errorMessage));
    },
    geolocationOptions
  );
}

/**
 * Clear location watch
 * @param {number} watchId - Watch ID from watchLocation
 */
export function clearLocationWatch(watchId) {
  if (watchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Check if geolocation is available
 * @returns {boolean}
 */
export function isGeolocationAvailable() {
  return 'geolocation' in navigator;
}

/**
 * Check location permission status
 * @returns {Promise<string>} - 'granted', 'denied', or 'prompt'
 */
export async function checkLocationPermission() {
  if (!navigator.permissions) {
    // Permissions API not supported, try to get location to check
    return 'prompt';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch {
    return 'prompt';
  }
}

/**
 * Format coordinates for display
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatCoordinates(latitude, longitude, decimals = 6) {
  const lat = latitude.toFixed(decimals);
  const lng = longitude.toFixed(decimals);
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lngDir = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(lat)}°${latDir}, ${Math.abs(lng)}°${lngDir}`;
}

/**
 * Calculate distance between two points (Haversine formula)
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} - Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
