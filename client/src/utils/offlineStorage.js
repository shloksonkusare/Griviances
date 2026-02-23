import localforage from 'localforage';

// Initialize localforage
localforage.config({
  name: 'grievance-portal',
  storeName: 'offline_complaints',
  description: 'Offline storage for pending complaints',
});

const PENDING_COMPLAINTS_KEY = 'pending_complaints';
const DRAFT_COMPLAINT_KEY = 'draft_complaint';

// Network status
export const isOnline = () => navigator.onLine;

// Listen for online/offline events
export const onNetworkChange = (callback) => {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
  
  return () => {
    window.removeEventListener('online', () => callback(true));
    window.removeEventListener('offline', () => callback(false));
  };
};

// Save draft complaint (auto-save)
export const saveDraftComplaint = async (data) => {
  try {
    await localforage.setItem(DRAFT_COMPLAINT_KEY, {
      ...data,
      savedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error saving draft:', error);
    return false;
  }
};

// Get draft complaint
export const getDraftComplaint = async () => {
  try {
    return await localforage.getItem(DRAFT_COMPLAINT_KEY);
  } catch (error) {
    console.error('Error getting draft:', error);
    return null;
  }
};

// Clear draft
export const clearDraftComplaint = async () => {
  try {
    await localforage.removeItem(DRAFT_COMPLAINT_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing draft:', error);
    return false;
  }
};

// Save complaint for offline submission
export const saveOfflineComplaint = async (complaint) => {
  try {
    const pending = (await localforage.getItem(PENDING_COMPLAINTS_KEY)) || [];
    const newComplaint = {
      ...complaint,
      offlineId: `offline_${Date.now()}`,
      savedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };
    pending.push(newComplaint);
    await localforage.setItem(PENDING_COMPLAINTS_KEY, pending);
    return newComplaint;
  } catch (error) {
    console.error('Error saving offline complaint:', error);
    throw error;
  }
};

// Get all pending offline complaints
export const getPendingComplaints = async () => {
  try {
    return (await localforage.getItem(PENDING_COMPLAINTS_KEY)) || [];
  } catch (error) {
    console.error('Error getting pending complaints:', error);
    return [];
  }
};

// Update sync status
export const updateComplaintSyncStatus = async (offlineId, status, serverResponse = null) => {
  try {
    const pending = (await localforage.getItem(PENDING_COMPLAINTS_KEY)) || [];
    const updated = pending.map((c) =>
      c.offlineId === offlineId
        ? { ...c, syncStatus: status, serverResponse, syncedAt: new Date().toISOString() }
        : c
    );
    await localforage.setItem(PENDING_COMPLAINTS_KEY, updated);
    return true;
  } catch (error) {
    console.error('Error updating sync status:', error);
    return false;
  }
};

// Remove synced complaint
export const removeSyncedComplaint = async (offlineId) => {
  try {
    const pending = (await localforage.getItem(PENDING_COMPLAINTS_KEY)) || [];
    const filtered = pending.filter((c) => c.offlineId !== offlineId);
    await localforage.setItem(PENDING_COMPLAINTS_KEY, filtered);
    return true;
  } catch (error) {
    console.error('Error removing synced complaint:', error);
    return false;
  }
};

// Clear all synced complaints
export const clearSyncedComplaints = async () => {
  try {
    const pending = (await localforage.getItem(PENDING_COMPLAINTS_KEY)) || [];
    const stillPending = pending.filter((c) => c.syncStatus !== 'synced');
    await localforage.setItem(PENDING_COMPLAINTS_KEY, stillPending);
    return true;
  } catch (error) {
    console.error('Error clearing synced complaints:', error);
    return false;
  }
};

// Sync all pending complaints
export const syncPendingComplaints = async (submitFunction) => {
  const pending = await getPendingComplaints();
  const results = [];

  for (const complaint of pending) {
    if (complaint.syncStatus === 'synced') continue;

    try {
      await updateComplaintSyncStatus(complaint.offlineId, 'syncing');
      const response = await submitFunction(complaint);
      await updateComplaintSyncStatus(complaint.offlineId, 'synced', response);
      results.push({ offlineId: complaint.offlineId, success: true, response });
    } catch (error) {
      await updateComplaintSyncStatus(complaint.offlineId, 'failed');
      results.push({ offlineId: complaint.offlineId, success: false, error: error.message });
    }
  }

  return results;
};

export default {
  isOnline,
  onNetworkChange,
  saveDraftComplaint,
  getDraftComplaint,
  clearDraftComplaint,
  saveOfflineComplaint,
  getPendingComplaints,
  updateComplaintSyncStatus,
  removeSyncedComplaint,
  clearSyncedComplaints,
  syncPendingComplaints,
};
