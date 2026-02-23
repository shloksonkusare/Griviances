import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MultiImageUpload({ 
  images = [], 
  onChange, 
  maxImages = 5, 
  maxSizeMB = 5 
}) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(null);
  const inputRef = useRef(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const handleFiles = (files) => {
    setError(null);
    const fileArray = Array.from(files);
    
    // Check total count
    if (images.length + fileArray.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    const validFiles = [];
    
    for (const file of fileArray) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not an image`);
        continue;
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        setError(`${file.name} exceeds ${maxSizeMB}MB limit`);
        continue;
      }

      validFiles.push({
        file,
        preview: URL.createObjectURL(file),
        id: Date.now() + Math.random(),
      });
    }

    if (validFiles.length > 0) {
      onChange([...images, ...validFiles]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (id) => {
    const imageToRemove = images.find(img => img.id === id);
    if (imageToRemove?.preview) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    onChange(images.filter(img => img.id !== id));
  };

  const reorderImages = (fromIndex, toIndex) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={images.length >= maxImages}
        />
        
        <div className="space-y-2">
          <div className="text-4xl">📷</div>
          <p className="text-gray-600 font-medium">
            {dragActive ? 'Drop images here' : 'Click or drag images to upload'}
          </p>
          <p className="text-gray-400 text-sm">
            {images.length}/{maxImages} images • Max {maxSizeMB}MB each
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-500 text-sm flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <AnimatePresence>
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200"
              >
                <img
                  src={image.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setPreviewIndex(index)}
                />
                
                {/* Primary badge for first image */}
                {index === 0 && (
                  <span className="absolute top-1 left-1 bg-primary-500 text-white text-xs px-2 py-0.5 rounded">
                    Primary
                  </span>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {/* Move left */}
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        reorderImages(index, index - 1);
                      }}
                      className="p-1.5 bg-white rounded-full hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  
                  {/* View */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewIndex(index);
                    }}
                    className="p-1.5 bg-white rounded-full hover:bg-gray-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </button>

                  {/* Move right */}
                  {index < images.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        reorderImages(index, index + 1);
                      }}
                      className="p-1.5 bg-white rounded-full hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(image.id);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Full Preview Modal */}
      <AnimatePresence>
        {previewIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewIndex(null)}
          >
            <button
              className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
              onClick={() => setPreviewIndex(null)}
            >
              ×
            </button>
            
            {/* Navigation */}
            {previewIndex > 0 && (
              <button
                className="absolute left-4 text-white text-4xl hover:text-gray-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex(previewIndex - 1);
                }}
              >
                ‹
              </button>
            )}
            
            {previewIndex < images.length - 1 && (
              <button
                className="absolute right-4 text-white text-4xl hover:text-gray-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex(previewIndex + 1);
                }}
              >
                ›
              </button>
            )}

            <motion.img
              key={previewIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={images[previewIndex]?.preview}
              alt={`Full preview ${previewIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              {previewIndex + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
