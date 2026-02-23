import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth store for admin authentication
export const useAuthStore = create(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      
      login: (admin, token) => {
        set({
          admin,
          token,
          isAuthenticated: true,
        });
      },
      
      logout: () => {
        set({
          admin: null,
          token: null,
          isAuthenticated: false,
        });
      },
      
      updateAdmin: (updates) => {
        set((state) => ({
          admin: { ...state.admin, ...updates },
        }));
      },
      
      getToken: () => get().token,
    }),
    {
      name: 'grievance-auth',
      partialize: (state) => ({
        admin: state.admin,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Complaint submission store
export const useComplaintStore = create((set, get) => ({
  // Form data
  step: 1,
  image: null,
  imageBlob: null,
  location: null,
  address: null,
  category: '',
  description: '',
  phoneNumber: '',
  name: '',
  sessionId: null,
  
  // Loading states
  isCapturingLocation: false,
  isLoadingAddress: false,
  isSubmitting: false,
  
  // Duplicate detection
  duplicates: null,
  showDuplicateWarning: false,
  
  // Result
  submissionResult: null,
  
  // Actions
  setStep: (step) => set({ step }),
  
  setImage: (image, blob) => set({ image, imageBlob: blob }),
  
  setLocation: (location) => set({ location }),
  
  setAddress: (address) => set({ address }),
  
  setCategory: (category) => set({ category }),
  
  setDescription: (description) => set({ description }),
  
  setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
  
  setName: (name) => set({ name }),
  
  setSessionId: (sessionId) => set({ sessionId }),
  
  setIsCapturingLocation: (isCapturing) => set({ isCapturingLocation: isCapturing }),
  
  setIsLoadingAddress: (isLoading) => set({ isLoadingAddress: isLoading }),
  
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  
  setDuplicates: (duplicates) => set({ duplicates, showDuplicateWarning: !!duplicates }),
  
  closeDuplicateWarning: () => set({ showDuplicateWarning: false }),
  
  setSubmissionResult: (result) => set({ submissionResult: result }),
  
  reset: () => set({
    step: 1,
    image: null,
    imageBlob: null,
    location: null,
    address: null,
    category: '',
    description: '',
    phoneNumber: '',
    name: '',
    duplicates: null,
    showDuplicateWarning: false,
    submissionResult: null,
    isCapturingLocation: false,
    isLoadingAddress: false,
    isSubmitting: false,
  }),
  
  // Getters
  isFormValid: () => {
    const state = get();
    return !!(
      state.image &&
      state.location &&
      state.category &&
      state.phoneNumber
    );
  },
}));

// Toast notification store
export const useToastStore = create((set) => ({
  toasts: [],
  
  addToast: (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// Settings store
export const useSettingsStore = create(
  persist(
    (set) => ({
      language: 'en',
      theme: 'light',
      
      setLanguage: (language) => {
        set({ language });
        document.documentElement.lang = language;
      },
      
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'grievance-settings',
    }
  )
);
