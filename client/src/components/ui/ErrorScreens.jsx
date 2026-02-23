import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon,
  CameraIcon,
  MapPinIcon,
  WifiIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const errorTypes = {
  camera_denied: {
    icon: CameraIcon,
    color: 'orange',
    canRetry: true,
    showSettings: true,
  },
  location_denied: {
    icon: MapPinIcon,
    color: 'orange',
    canRetry: true,
    showSettings: true,
  },
  network_error: {
    icon: WifiIcon,
    color: 'red',
    canRetry: true,
    showSettings: false,
  },
  upload_failed: {
    icon: ExclamationTriangleIcon,
    color: 'red',
    canRetry: true,
    showSettings: false,
  },
  generic: {
    icon: ExclamationTriangleIcon,
    color: 'red',
    canRetry: true,
    showSettings: false,
  },
};

export default function ErrorScreen({ 
  type = 'generic', 
  title,
  message, 
  onRetry, 
  onCancel,
  onOpenSettings,
  customIcon 
}) {
  const { t } = useTranslation();
  const config = errorTypes[type] || errorTypes.generic;
  const Icon = customIcon || config.icon;

  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      title: 'text-red-900',
      text: 'text-red-700',
      btnPrimary: 'bg-red-600 hover:bg-red-700',
    },
    orange: {
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      title: 'text-orange-900',
      text: 'text-orange-700',
      btnPrimary: 'bg-orange-600 hover:bg-orange-700',
    },
    yellow: {
      bg: 'bg-yellow-50',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      title: 'text-yellow-900',
      text: 'text-yellow-700',
      btnPrimary: 'bg-yellow-600 hover:bg-yellow-700',
    },
  };

  const colors = colorClasses[config.color] || colorClasses.red;

  // Default messages based on type
  const defaultMessages = {
    camera_denied: {
      title: t('camera_access_denied'),
      message: t('camera_denied_message'),
      instructions: [
        t('camera_instruction_1'),
        t('camera_instruction_2'),
        t('camera_instruction_3'),
      ],
    },
    location_denied: {
      title: t('location_access_denied'),
      message: t('location_denied_message'),
      instructions: [
        t('location_instruction_1'),
        t('location_instruction_2'),
        t('location_instruction_3'),
      ],
    },
    network_error: {
      title: t('network_error'),
      message: t('network_error_message'),
      instructions: [
        t('network_instruction_1'),
        t('network_instruction_2'),
      ],
    },
    upload_failed: {
      title: t('upload_failed'),
      message: t('upload_failed_message'),
      instructions: [],
    },
    generic: {
      title: t('something_went_wrong'),
      message: t('generic_error_message'),
      instructions: [],
    },
  };

  const defaults = defaultMessages[type] || defaultMessages.generic;
  const displayTitle = title || defaults.title;
  const displayMessage = message || defaults.message;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`${colors.bg} rounded-2xl p-6 max-w-md mx-auto`}
    >
      {/* Icon */}
      <div className="flex justify-center mb-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className={`w-16 h-16 ${colors.iconBg} rounded-full flex items-center justify-center`}
        >
          <Icon className={`w-8 h-8 ${colors.iconColor}`} />
        </motion.div>
      </div>

      {/* Title & Message */}
      <div className="text-center mb-6">
        <h3 className={`text-lg font-semibold ${colors.title} mb-2`}>
          {displayTitle}
        </h3>
        <p className={`text-sm ${colors.text}`}>
          {displayMessage}
        </p>
      </div>

      {/* Instructions */}
      {defaults.instructions.length > 0 && (
        <div className="bg-white/60 rounded-xl p-4 mb-6">
          <p className={`text-sm font-medium ${colors.title} mb-2`}>
            {t('how_to_fix')}
          </p>
          <ol className="space-y-2">
            {defaults.instructions.map((instruction, index) => (
              <li key={index} className={`text-xs ${colors.text} flex items-start gap-2`}>
                <span className={`${colors.iconBg} ${colors.iconColor} w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium`}>
                  {index + 1}
                </span>
                <span>{instruction}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {config.canRetry && onRetry && (
          <button
            onClick={onRetry}
            className={`w-full py-3 px-4 ${colors.btnPrimary} text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition`}
          >
            <ArrowPathIcon className="w-4 h-4" />
            {t('try_again')}
          </button>
        )}
        
        {config.showSettings && onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
          >
            {t('open_settings')}
          </button>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className={`w-full py-2 px-4 text-sm ${colors.text} hover:underline`}
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Inline error message
export function InlineError({ message, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
    >
      <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-700 flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600">
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

// Success confirmation
export function SuccessScreen({ title, message, onContinue, children }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-green-50 rounded-2xl p-6 max-w-md mx-auto text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
        className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <motion.svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </motion.svg>
      </motion.div>

      <h3 className="text-lg font-semibold text-green-900 mb-2">{title}</h3>
      <p className="text-sm text-green-700 mb-4">{message}</p>
      
      {children}

      {onContinue && (
        <button
          onClick={onContinue}
          className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition mt-4"
        >
          {t('continue')}
        </button>
      )}
    </motion.div>
  );
}
