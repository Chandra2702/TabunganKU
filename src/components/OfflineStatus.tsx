import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { getSyncQueue } from '../lib/syncEngine';

interface OfflineStatusProps {
  onSyncTrigger: () => void;
  isSyncing: boolean;
  syncMessage: string;
}

export default function OfflineStatus({ onSyncTrigger, isSyncing, syncMessage }: OfflineStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll pending sync queue count
    const interval = setInterval(() => {
      setPendingCount(getSyncQueue().length);
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Auto-sync when transitioning from offline to online
    if (isOnline && pendingCount > 0 && !isSyncing) {
      onSyncTrigger();
    }
  }, [isOnline, pendingCount]);

  if (!isOnline) {
    return (
      <div id="offline-banner" className="bg-amber-500 text-white text-xs py-2 px-4 flex items-center justify-between shadow-inner animate-pulse">
        <div className="flex items-center gap-2 font-medium">
          <WifiOff size={14} />
          <span>Bekerja Offline (Koneksi Terputus). Data disimpan di perangkat ini.</span>
        </div>
        {pendingCount > 0 && (
          <span className="bg-amber-700 text-amber-100 px-2 py-0.5 rounded-full text-[10px]">
            {pendingCount} antrean sync
          </span>
        )}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div id="sync-banner" className="bg-blue-600 text-white text-xs py-2 px-4 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-2 font-medium">
          <RefreshCw size={14} className="animate-spin" />
          <span>{syncMessage || 'Mensinkronisasi data...'}</span>
        </div>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div id="pending-sync-banner" className="bg-indigo-600 text-white text-xs py-2 px-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 font-medium">
          <Wifi size={14} className="text-indigo-200" />
          <span>Ada {pendingCount} perubahan yang belum disimpan ke Google Sheets.</span>
        </div>
        <button
          onClick={onSyncTrigger}
          className="bg-white text-indigo-700 hover:bg-indigo-50 px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <RefreshCw size={12} />
          <span>Sinkronkan Sekarang</span>
        </button>
      </div>
    );
  }

  return null;
}
