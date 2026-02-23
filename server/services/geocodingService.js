const axios = require('axios');
const config = require('../config');
const AuditLog = require('../models/AuditLog');

class GeocodingService {
  constructor() {
    this.nominatimUrl = config.geocoding.apiUrl;
    this.googleApiKey = config.geocoding.googleMapsApiKey;
  }

  /**
   * Reverse geocode coordinates to address using OpenStreetMap Nominatim
   * Free tier, but has rate limits (1 request/second)
   */
  async reverseGeocodeNominatim(latitude, longitude) {
    try {
      const response = await axios.get(this.nominatimUrl, {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
          'accept-language': 'en',
        },
        headers: {
          'User-Agent': 'GrievancePortal/1.0', // Required by Nominatim
        },
        timeout: 10000,
      });

      const data = response.data;
      
      if (!data || !data.address) {
        throw new Error('No address found for coordinates');
      }

      const address = data.address;
      
      return {
        success: true,
        address: {
          street: address.road || address.street || address.pedestrian || '',
          area: address.suburb || address.neighbourhood || address.hamlet || address.village || '',
          city: address.city || address.town || address.municipality || '',
          district: address.county || address.district || address.state_district || '',
          state: address.state || '',
          postalCode: address.postcode || '',
          country: address.country || '',
          fullAddress: data.display_name,
          raw: address,
        },
        source: 'nominatim',
      };
    } catch (error) {
      console.error('Nominatim geocoding failed:', error.message);
      return {
        success: false,
        error: error.message,
        source: 'nominatim',
      };
    }
  }

  /**
   * Reverse geocode using Google Maps API (more reliable, but paid)
   */
  async reverseGeocodeGoogle(latitude, longitude) {
    if (!this.googleApiKey) {
      return { success: false, error: 'Google Maps API key not configured' };
    }

    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            latlng: `${latitude},${longitude}`,
            key: this.googleApiKey,
            language: 'en',
          },
          timeout: 10000,
        }
      );

      const data = response.data;
      
      if (data.status !== 'OK' || !data.results?.length) {
        throw new Error(data.status || 'No results found');
      }

      const result = data.results[0];
      const components = {};
      
      // Parse address components
      result.address_components.forEach(component => {
        if (component.types.includes('route')) {
          components.street = component.long_name;
        }
        if (component.types.includes('sublocality_level_1') || component.types.includes('sublocality')) {
          components.area = component.long_name;
        }
        if (component.types.includes('locality')) {
          components.city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_2')) {
          components.district = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          components.state = component.long_name;
        }
        if (component.types.includes('postal_code')) {
          components.postalCode = component.long_name;
        }
        if (component.types.includes('country')) {
          components.country = component.long_name;
        }
      });

      return {
        success: true,
        address: {
          street: components.street || '',
          area: components.area || '',
          city: components.city || '',
          district: components.district || '',
          state: components.state || '',
          postalCode: components.postalCode || '',
          country: components.country || '',
          fullAddress: result.formatted_address,
          raw: result.address_components,
        },
        source: 'google',
      };
    } catch (error) {
      console.error('Google geocoding failed:', error.message);
      return {
        success: false,
        error: error.message,
        source: 'google',
      };
    }
  }

  /**
   * Main reverse geocoding method with fallback
   * Tries Google first if configured, falls back to Nominatim
   */
  async reverseGeocode(latitude, longitude, complaintId = null) {
    let result;

    // Try Google first if API key is configured
    if (this.googleApiKey) {
      result = await this.reverseGeocodeGoogle(latitude, longitude);
      if (result.success) {
        await this.logGeocodingResult(result, latitude, longitude, complaintId);
        return result;
      }
    }

    // Fallback to Nominatim
    result = await this.reverseGeocodeNominatim(latitude, longitude);
    
    // Log the result
    await this.logGeocodingResult(result, latitude, longitude, complaintId);

    // If both fail, return a basic result
    if (!result.success) {
      return {
        success: false,
        address: {
          street: '',
          area: '',
          city: '',
          district: '',
          state: '',
          postalCode: '',
          fullAddress: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          raw: null,
        },
        error: result.error,
      };
    }

    return result;
  }

  /**
   * Log geocoding result for auditing
   */
  async logGeocodingResult(result, latitude, longitude, complaintId) {
    await AuditLog.log(result.success ? 'geocoding_success' : 'geocoding_failed', {
      complaintId,
      details: {
        latitude,
        longitude,
        source: result.source,
        address: result.address?.fullAddress,
      },
      success: result.success,
      errorMessage: result.error,
    });
  }

  /**
   * Format address for display
   */
  formatAddressForDisplay(address) {
    if (!address) return 'Address not available';

    const parts = [];
    
    if (address.street) parts.push(address.street);
    if (address.area) parts.push(address.area);
    if (address.city) parts.push(address.city);
    if (address.district && address.district !== address.city) {
      parts.push(address.district);
    }
    if (address.state) parts.push(address.state);
    if (address.postalCode) parts.push(address.postalCode);

    return parts.length > 0 ? parts.join(', ') : address.fullAddress || 'Address not available';
  }

  /**
   * Calculate distance between two points in meters (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}

module.exports = new GeocodingService();
