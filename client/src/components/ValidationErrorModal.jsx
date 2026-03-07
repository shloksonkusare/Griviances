import { XMarkIcon, CameraIcon, CheckIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

function ValidationErrorModal({ isOpen, onClose, validationError, onRetake }) {
  if (!isOpen || !validationError) return null;

  const getErrorDetails = () => {
    const reason = (validationError.validation?.reason || '').toLowerCase();
    
    if (reason.includes('selfie') || reason.includes('person') || reason.includes('face')) {
      return {
        icon: '🤳',
        title: 'Selfie Detected',
        primaryMessage: 'This appears to be a selfie or portrait photo.',
        secondaryMessage: 'Please take a photo of the damaged road, garbage, street light, or other municipal issue.',
        color: 'blue'
      };
    }
    
    if (reason.includes('dog') || reason.includes('cat') || reason.includes('animal')) {
      return {
        icon: '🐕',
        title: 'Animal Photo Detected',
        primaryMessage: 'This appears to be a photo of an animal.',
        secondaryMessage: 'Please take a photo showing a civic infrastructure problem.',
        color: 'amber'
      };
    }
    
    if (reason.includes('food') || reason.includes('meal')) {
      return {
        icon: '🍽️',
        title: 'Food Photo Detected',
        primaryMessage: 'This appears to be a photo of food.',
        secondaryMessage: 'Please take a photo of a municipal complaint.',
        color: 'orange'
      };
    }
    
    return {
      icon: '⚠️',
      title: 'Invalid Image',
      primaryMessage: validationError.message,
      secondaryMessage: 'Please take a clear photo showing the problem you want to report.',
      color: 'red'
    };
  };

  const errorDetails = getErrorDetails();
  
  const colorClasses = {
    blue: { bg: 'bg-blue-100', button: 'bg-blue-600 hover:bg-blue-700' },
    amber: { bg: 'bg-amber-100', button: 'bg-amber-600 hover:bg-amber-700' },
    orange: { bg: 'bg-orange-100', button: 'bg-orange-600 hover:bg-orange-700' },
    red: { bg: 'bg-red-100', button: 'bg-red-600 hover:bg-red-700' }
  };
  
  const colors = colorClasses[errorDetails.color];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4">
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
              <XMarkIcon className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className={`pt-8 pb-6 px-6 ${colors.bg}`}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
                <span className="text-5xl">{errorDetails.icon}</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{errorDetails.title}</h2>
            </div>
          </div>

          <div className="p-6">
            <p className="text-gray-700 text-center mb-3 font-medium">
              {errorDetails.primaryMessage}
            </p>
            <p className="text-gray-600 text-center text-sm mb-6">
              {errorDetails.secondaryMessage}
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-green-800 mb-2">
                ✓ Valid Municipal Issues:
              </p>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• Potholes or damaged roads</li>
                <li>• Garbage on streets</li>
                <li>• Fallen trees</li>
                <li>• Broken street lights</li>
                <li>• Graffiti on public property</li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { onRetake(); onClose(); }}
                className={`w-full py-4 text-white rounded-xl font-semibold ${colors.button}`}
              >
                <span className="flex items-center justify-center gap-2">
                  <CameraIcon className="w-5 h-5" />
                  Retake Photo
                </span>
              </button>
              
              <button
                onClick={onClose}
                className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ValidationErrorModal;