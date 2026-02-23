import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useTranslation } from 'react-i18next';
import { compressDataUrl } from '../utils/imageCompression';

export default function CameraCapture({ onCapture, onError }) {
  const { t } = useTranslation();
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'

  const videoConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    facingMode: facingMode,
  };

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  const handleUsePhoto = async () => {
    if (!capturedImage) return;
    
    setIsCompressing(true);
    try {
      const compressed = await compressDataUrl(capturedImage, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
      });
      onCapture(compressed.dataUrl, compressed.blob);
    } catch (error) {
      console.error('Compression error:', error);
      onError?.(t('error_generic'));
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleCameraError = (error) => {
    console.error('Camera error:', error);
    let errorMessage = t('camera_error');
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = t('camera_permission_denied');
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = t('camera_not_supported');
    }
    
    setCameraError(errorMessage);
    onError?.(errorMessage);
  };

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-xl min-h-[300px]">
        <svg
          className="w-16 h-16 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-gray-600 text-center mb-4">{cameraError}</p>
        <button
          onClick={() => {
            setCameraError(null);
            setFacingMode('environment');
          }}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Camera / Preview Container */}
      <div className="relative w-full max-w-md aspect-[4/3] bg-black rounded-xl overflow-hidden">
        {capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.92}
              videoConstraints={videoConstraints}
              onUserMediaError={handleCameraError}
              className="w-full h-full object-cover"
            />
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-4 border-2 border-white/30 rounded-lg" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-16 h-16 border-2 border-white/50 rounded-full" />
              </div>
            </div>
          </>
        )}

        {/* Loading overlay */}
        {isCompressing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="spinner w-12 h-12" />
          </div>
        )}
      </div>

      {/* Instructions */}
      {!capturedImage && (
        <p className="text-sm text-gray-500 mt-3 text-center">
          {t('camera_instruction')}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4 mt-6">
        {capturedImage ? (
          <>
            <button
              onClick={handleRetake}
              className="btn-secondary px-6"
              disabled={isCompressing}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('camera_retake')}
            </button>
            <button
              onClick={handleUsePhoto}
              className="btn-primary px-6"
              disabled={isCompressing}
            >
              {isCompressing ? (
                <>
                  <div className="spinner w-5 h-5 mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('camera_use_photo')}
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {/* Switch camera button (for mobile) */}
            <button
              onClick={switchCamera}
              className="p-3 rounded-full bg-gray-800/80 text-white hover:bg-gray-700 transition-colors"
              title="Switch camera"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            {/* Capture button */}
            <button
              onClick={capture}
              className="p-4 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-lg"
              title={t('camera_capture')}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3" strokeWidth={2} />
              </svg>
            </button>
            
            {/* Placeholder for symmetry */}
            <div className="w-12" />
          </>
        )}
      </div>
    </div>
  );
}
