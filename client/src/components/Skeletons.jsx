import { motion } from 'framer-motion';

// Skeleton loader components
export function SkeletonLine({ width = 'full', height = 'h-4' }) {
  return (
    <div className={`${height} bg-gray-200 rounded animate-pulse ${
      width === 'full' ? 'w-full' : `w-${width}`
    }`} />
  );
}

export function SkeletonCircle({ size = 10 }) {
  return (
    <div className={`w-${size} h-${size} bg-gray-200 rounded-full animate-pulse`} />
  );
}

export function SkeletonRect({ width = 'full', height = 'h-32', rounded = 'rounded-xl' }) {
  return (
    <div className={`${height} ${rounded} bg-gray-200 animate-pulse ${
      width === 'full' ? 'w-full' : `w-${width}`
    }`} />
  );
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded flex-1" />
          ))}
        </div>
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="px-4 py-4 border-b border-gray-100 last:border-0">
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, col) => (
              <div key={col} className="h-4 bg-gray-200 rounded flex-1" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Stats skeleton
export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
      ))}
    </div>
  );
}

// Map skeleton
export function MapSkeleton() {
  return (
    <div className="bg-gray-200 rounded-xl h-96 animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-3 flex items-center justify-center">
          <span className="text-2xl opacity-50">🗺️</span>
        </div>
        <p className="text-gray-400 text-sm">Loading map...</p>
      </div>
    </div>
  );
}

// Image skeleton
export function ImageSkeleton({ aspectRatio = 'aspect-video' }) {
  return (
    <div className={`bg-gray-200 rounded-xl ${aspectRatio} animate-pulse flex items-center justify-center`}>
      <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

// Form skeleton
export function FormSkeleton({ fields = 3 }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-10 bg-gray-200 rounded-lg" />
        </div>
      ))}
      <div className="h-12 bg-gray-200 rounded-xl mt-6" />
    </div>
  );
}

// Page loader
export function PageLoader({ message = 'Loading...' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"
        />
        <p className="text-gray-600">{message}</p>
      </div>
    </motion.div>
  );
}

// Inline spinner
export function Spinner({ size = 'md', color = 'primary' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  };

  const colors = {
    primary: 'border-primary-200 border-t-primary-600',
    white: 'border-white/30 border-t-white',
    gray: 'border-gray-200 border-t-gray-600',
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`${sizes[size]} ${colors[color]} rounded-full`}
    />
  );
}

export default {
  SkeletonLine,
  SkeletonCircle,
  SkeletonRect,
  CardSkeleton,
  TableSkeleton,
  StatsSkeleton,
  MapSkeleton,
  ImageSkeleton,
  FormSkeleton,
  PageLoader,
  Spinner,
};
