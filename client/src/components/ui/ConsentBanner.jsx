import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheckIcon, 
  MapPinIcon, 
  CameraIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

export default function ConsentBanner({ 
  onAccept, 
  onDecline, 
  requiredPermissions = ['camera', 'location', 'data'] 
}) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const permissions = {
    camera: {
      icon: CameraIcon,
      title: t('camera_permission'),
      description: t('camera_permission_desc'),
      details: t('camera_permission_details'),
    },
    location: {
      icon: MapPinIcon,
      title: t('location_permission'),
      description: t('location_permission_desc'),
      details: t('location_permission_details'),
    },
    data: {
      icon: DocumentTextIcon,
      title: t('data_usage'),
      description: t('data_usage_desc'),
      details: t('data_usage_details'),
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-lg mx-auto"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t('consent_title')}</h2>
            <p className="text-primary-100 text-sm">{t('consent_subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Permission List */}
      <div className="p-6">
        <p className="text-gray-600 text-sm mb-4">
          {t('consent_intro')}
        </p>

        <div className="space-y-3">
          {requiredPermissions.map((perm) => {
            const permission = permissions[perm];
            if (!permission) return null;
            const Icon = permission.icon;

            return (
              <div
                key={perm}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 text-sm">
                    {permission.title}
                  </h3>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {permission.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy Details Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 mt-4 w-full justify-center"
        >
          <span>{showDetails ? t('hide_details') : t('view_privacy_details')}</span>
          <ChevronDownIcon 
            className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} 
          />
        </button>

        {/* Expanded Details */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="font-medium text-blue-900 text-sm mb-2">
                  {t('privacy_summary')}
                </h4>
                <ul className="space-y-2 text-xs text-blue-800">
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{t('privacy_point_1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{t('privacy_point_2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{t('privacy_point_3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{t('privacy_point_4')}</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Consent Checkbox */}
        <label className="flex items-start gap-3 mt-6 cursor-pointer">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                acceptedTerms
                  ? 'bg-primary-600 border-primary-600'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {acceptedTerms && <CheckIcon className="w-3 h-3 text-white" />}
            </div>
          </div>
          <span className="text-sm text-gray-700">
            {t('consent_checkbox_text')}
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 flex gap-3">
        <button
          onClick={onDecline}
          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
        >
          {t('decline')}
        </button>
        <button
          onClick={onAccept}
          disabled={!acceptedTerms}
          className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition ${
            acceptedTerms
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {t('accept_continue')}
        </button>
      </div>
    </motion.div>
  );
}

// Compact inline consent for specific permissions
export function InlineConsent({ permission, onGrant, onDeny }) {
  const { t } = useTranslation();
  
  const icons = {
    camera: CameraIcon,
    location: MapPinIcon,
  };
  
  const Icon = icons[permission] || DocumentTextIcon;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Icon className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-amber-900 text-sm">
            {t(`${permission}_required_title`)}
          </h3>
          <p className="text-amber-700 text-xs mt-1">
            {t(`${permission}_required_desc`)}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onGrant}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700"
            >
              {t('grant_permission')}
            </button>
            <button
              onClick={onDeny}
              className="px-3 py-1.5 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-medium"
            >
              {t('not_now')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
