import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function ImageCompressionUI({ originalImage, compressedImage, isCompressing, onCompress }) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const compressionRatio = originalImage && compressedImage
    ? Math.round((1 - compressedImage.size / originalImage.size) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🖼️</span>
            <span className="font-medium text-gray-900">
              {t('image.optimization', 'Image Optimization')}
            </span>
          </div>
          {compressedImage && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              {compressionRatio}% {t('image.smaller', 'smaller')}
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      {isCompressing && (
        <div className="px-4 py-6">
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full"
            />
            <div className="text-center">
              <p className="font-medium text-gray-900">
                {t('image.compressing', 'Compressing image...')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {t('image.please_wait', 'Please wait')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comparison */}
      {!isCompressing && originalImage && compressedImage && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Original */}
            <div className="text-center">
              <div className="aspect-video bg-gray-100 rounded-lg mb-2 overflow-hidden">
                <img
                  src={originalImage.preview}
                  alt="Original"
                  className="w-full h-full object-cover opacity-50"
                />
              </div>
              <p className="text-xs text-gray-500">{t('image.original', 'Original')}</p>
              <p className="font-medium text-gray-900">{formatSize(originalImage.size)}</p>
            </div>

            {/* Compressed */}
            <div className="text-center">
              <div className="aspect-video bg-gray-100 rounded-lg mb-2 overflow-hidden ring-2 ring-green-500 ring-offset-2">
                <img
                  src={compressedImage.preview}
                  alt="Compressed"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-gray-500">{t('image.compressed', 'Optimized')}</p>
              <p className="font-medium text-green-600">{formatSize(compressedImage.size)}</p>
            </div>
          </div>

          {/* Stats */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-sm text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1"
          >
            {showDetails ? t('image.hide_details', 'Hide details') : t('image.show_details', 'Show details')}
            <motion.svg
              animate={{ rotate: showDetails ? 180 : 0 }}
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </button>

          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-3 pt-3 border-t border-gray-200"
            >
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-500 text-xs">Original Size</p>
                  <p className="font-medium">{formatSize(originalImage.size)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-500 text-xs">Compressed Size</p>
                  <p className="font-medium">{formatSize(compressedImage.size)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-500 text-xs">Dimensions</p>
                  <p className="font-medium">{compressedImage.width}×{compressedImage.height}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-500 text-xs">Saved</p>
                  <p className="font-medium text-green-600">
                    {formatSize(originalImage.size - compressedImage.size)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

// Upload progress indicator
export function UploadProgress({ progress, status }) {
  const { t } = useTranslation();

  const statusLabels = {
    compressing: t('upload.compressing', 'Compressing...'),
    uploading: t('upload.uploading', 'Uploading...'),
    processing: t('upload.processing', 'Processing...'),
    complete: t('upload.complete', 'Complete!'),
    error: t('upload.error', 'Error'),
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {statusLabels[status] || status}
        </span>
        <span className="text-sm text-gray-500">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            status === 'complete' ? 'bg-green-500' :
            status === 'error' ? 'bg-red-500' :
            'bg-primary-500'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      {status === 'complete' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-3 text-green-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">{t('upload.success', 'Upload successful!')}</span>
        </motion.div>
      )}
    </div>
  );
}
