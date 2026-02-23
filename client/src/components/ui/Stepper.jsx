import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@heroicons/react/24/solid';

export default function Stepper({ steps, currentStep, onStepClick }) {
  const { t } = useTranslation();

  return (
    <div className="w-full py-4">
      {/* Mobile Stepper */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-primary-600">
            {t('step')} {currentStep + 1} {t('of')} {steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {steps[currentStep]?.label}
          </span>
        </div>
        <div className="relative">
          <div className="overflow-hidden h-2 bg-gray-200 rounded-full">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex flex-col items-center ${
                index <= currentStep ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  index < currentStep
                    ? 'bg-primary-600'
                    : index === currentStep
                    ? 'bg-primary-600 ring-4 ring-primary-100'
                    : 'bg-gray-300'
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Stepper */}
      <div className="hidden sm:block">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className={`relative ${
                  index !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''
                }`}
              >
                {/* Connector Line */}
                {index !== steps.length - 1 && (
                  <div
                    className="absolute top-4 left-7 -ml-px w-full h-0.5"
                    aria-hidden="true"
                  >
                    <motion.div
                      className="h-full bg-primary-600"
                      initial={{ width: 0 }}
                      animate={{ width: index < currentStep ? '100%' : '0%' }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                    <div className="absolute inset-0 bg-gray-200 -z-10" />
                  </div>
                )}

                <button
                  onClick={() => onStepClick && index < currentStep && onStepClick(index)}
                  disabled={index > currentStep}
                  className={`group flex items-center ${
                    index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center">
                    <motion.span
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                        index < currentStep
                          ? 'bg-primary-600 hover:bg-primary-700'
                          : index === currentStep
                          ? 'border-2 border-primary-600 bg-white'
                          : 'border-2 border-gray-300 bg-white'
                      }`}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: index === currentStep ? 1.1 : 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {index < currentStep ? (
                        <CheckIcon className="h-5 w-5 text-white" />
                      ) : (
                        <span
                          className={`text-sm font-medium ${
                            index === currentStep
                              ? 'text-primary-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </span>
                      )}
                      
                      {/* Pulse animation for current step */}
                      {index === currentStep && (
                        <motion.span
                          className="absolute inset-0 rounded-full border-2 border-primary-400"
                          animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </motion.span>
                  </span>
                  <span className="ml-3 flex flex-col">
                    <span
                      className={`text-sm font-medium ${
                        index <= currentStep ? 'text-primary-600' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.description && (
                      <span className="text-xs text-gray-500">{step.description}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}
