import { Siswa, Transaksi, SyncQueueItem } from '../types';
import { 
  findOrCreateSpreadsheet, 
  fetchSiswaFromSheets, 
  fetchTransaksiFromSheets, 
  appendSiswaToSheets, 
  appendTransaksiToSheets,
  overwriteSiswaOnSheets,
  overwriteTransaksiOnSheets
} from './googleSheets';

const SISWA_KEY = 'tabungan_siswa_data';
const TRANSAKSI_KEY = 'tabungan_transaksi_data';
const QUEUE_KEY = 'tabungan_sync_queue';
const SHEET_ID_KEY = 'tabungan_spreadsheet_id';

// Local storage helpers
export const getLocalSiswa = (): Siswa[] => {
  const data = localStorage.getItem(SISWA_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveLocalSiswa = (siswa: Siswa[]) => {
  localStorage.setItem(SISWA_KEY, JSON.stringify(siswa));
};

export const getLocalTransaksi = (): Transaksi[] => {
  const data = localStorage.getItem(TRANSAKSI_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveLocalTransaksi = (transaksi: Transaksi[]) => {
  localStorage.setItem(TRANSAKSI_KEY, JSON.stringify(transaksi));
};

export const getSyncQueue = (): SyncQueueItem[] => {
  const data = localStorage.getItem(QUEUE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveSyncQueue = (queue: SyncQueueItem[]) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getSavedSpreadsheetId = (): string | null => {
  return localStorage.getItem(SHEET_ID_KEY);
};

export const saveSpreadsheetId = (id: string) => {
  localStorage.setItem(SHEET_ID_KEY, id);
};

/**
 * Add a new Siswa locally first, then queue for sync.
 */
export const addSiswaLocal = (siswa: Siswa): void => {
  const current = getLocalSiswa();
  saveLocalSiswa([...current, siswa]);

  const queue = getSyncQueue();
  const newItem: SyncQueueItem = {
    id: crypto.randomUUID(),
    action: 'CREATE_SISWA',
    data: siswa,
    timestamp: Date.now(),
  };
  saveSyncQueue([...queue, newItem]);
};

/**
 * Update the entire list of students locally (bulk), then queue for sync overwrite.
 */
export const updateSiswaBulkLocal = (updatedSiswa: Siswa[]): void => {
  saveLocalSiswa(updatedSiswa);

  const queue = getSyncQueue();
  // Filter out any pending individual student creations since they are now obsolete/captured in this bulk list
  const filteredQueue = queue.filter(item => item.action !== 'CREATE_SISWA');

  const newItem: SyncQueueItem = {
    id: crypto.randomUUID(),
    action: 'OVERWRITE_SISWA' as any,
    data: updatedSiswa,
    timestamp: Date.now(),
  };
  saveSyncQueue([...filteredQueue, newItem]);
};

/**
 * Add a new Transaksi locally first, then queue for sync.
 */
export const addTransaksiLocal = (transaksi: Transaksi): void => {
  const current = getLocalTransaksi();
  saveLocalTransaksi([...current, transaksi]);

  const queue = getSyncQueue();
  const newItem: SyncQueueItem = {
    id: crypto.randomUUID(),
    action: 'CREATE_TRANSAKSI',
    data: transaksi,
    timestamp: Date.now(),
  };
  saveSyncQueue([...queue, newItem]);
};

/**
 * Update the entire list of transactions locally (bulk), then queue for sync overwrite.
 */
export const updateTransaksiBulkLocal = (updatedTransaksi: Transaksi[]): void => {
  saveLocalTransaksi(updatedTransaksi);

  const queue = getSyncQueue();
  // Filter out any pending individual transaction creations since they are now obsolete/captured in this bulk list
  const filteredQueue = queue.filter(item => item.action !== 'CREATE_TRANSAKSI');

  const newItem: SyncQueueItem = {
    id: crypto.randomUUID(),
    action: 'OVERWRITE_TRANSAKSI' as any,
    data: updatedTransaksi,
    timestamp: Date.now(),
  };
  saveSyncQueue([...filteredQueue, newItem]);
};

/**
 * Synchronize local changes to Google Sheets and fetch latest data.
 */
export const syncWithSheets = async (
  accessToken: string,
  onProgress?: (status: string) => void
): Promise<{ siswa: Siswa[]; transaksi: Transaksi[] }> => {
  try {
    onProgress?.('Menghubungkan ke Google Sheets...');
    const spreadsheetId = await findOrCreateSpreadsheet(accessToken);
    saveSpreadsheetId(spreadsheetId);

    // 1. Process sync queue if we have items
    const queue = getSyncQueue();
    if (queue.length > 0) {
      onProgress?.(`Mensinkronisasi ${queue.length} perubahan offline...`);

      // Check if we have an OVERWRITE_SISWA action in the queue
      const hasOverwrite = queue.some(item => item.action === ('OVERWRITE_SISWA' as any));

      if (hasOverwrite) {
        // If there's an overwrite, get the latest one in queue (final state) and overwrite on sheets
        const overwriteItems = queue.filter(item => item.action === ('OVERWRITE_SISWA' as any));
        const finalSiswaList = overwriteItems[overwriteItems.length - 1].data as Siswa[];
        await overwriteSiswaOnSheets(spreadsheetId, finalSiswaList, accessToken);
      } else {
        // Batch normal siswa creations
        const siswaItems = queue
          .filter(item => item.action === 'CREATE_SISWA')
          .map(item => item.data as Siswa);
        
        if (siswaItems.length > 0) {
          await appendSiswaToSheets(spreadsheetId, siswaItems, accessToken);
        }
      }

      // Check if we have an OVERWRITE_TRANSAKSI action in the queue
      const hasOverwriteTransaksi = queue.some(item => item.action === ('OVERWRITE_TRANSAKSI' as any));
      const currentSiswa = getLocalSiswa();

      if (hasOverwriteTransaksi) {
        // If there's a transactions overwrite, get the latest one in queue and overwrite on sheets
        const overwriteTxItems = queue.filter(item => item.action === ('OVERWRITE_TRANSAKSI' as any));
        const finalTransaksiList = overwriteTxItems[overwriteTxItems.length - 1].data as Transaksi[];
        await overwriteTransaksiOnSheets(spreadsheetId, finalTransaksiList, accessToken, currentSiswa);
      } else {
        // Batch normal transaksi creations
        const transaksiItems = queue
          .filter(item => item.action === 'CREATE_TRANSAKSI')
          .map(item => item.data as Transaksi);

        if (transaksiItems.length > 0) {
          await appendTransaksiToSheets(spreadsheetId, transaksiItems, accessToken, currentSiswa);
        }
      }

      // Clear sync queue on successful push
      saveSyncQueue([]);

      // Automatically update the "Saldo" column on Google Sheets for all students to match the new transactions
      try {
        const finalSiswa = getLocalSiswa();
        const finalTransaksi = getLocalTransaksi();
        const enrichedSiswa = finalSiswa.map(s => {
          const studentTransactions = finalTransaksi.filter(t => t.siswaId === s.id);
          const totalMasuk = studentTransactions.filter(t => t.tipe === 'MASUK').reduce((sum, t) => sum + t.jumlah, 0);
          const totalKeluar = studentTransactions.filter(t => t.tipe === 'KELUAR').reduce((sum, t) => sum + t.jumlah, 0);
          return {
            ...s,
            saldo: totalMasuk - totalKeluar
          };
        });
        await overwriteSiswaOnSheets(spreadsheetId, enrichedSiswa, accessToken);
      } catch (e) {
        console.warn('Failed to update student balances on sheet:', e);
      }
    }

    // 2. Fetch latest state from sheets
    onProgress?.('Mengambil data terbaru...');
    const latestSiswa = await fetchSiswaFromSheets(spreadsheetId, accessToken);
    const latestTransaksi = await fetchTransaksiFromSheets(spreadsheetId, accessToken);

    // Save fetched data to local cache
    saveLocalSiswa(latestSiswa);
    saveLocalTransaksi(latestTransaksi);

    onProgress?.('Sinkronisasi selesai!');
    return { siswa: latestSiswa, transaksi: latestTransaksi };
  } catch (error) {
    console.error('Sync failed:', error);
    // If sync fails (e.g. offline, token expired, etc.), return local cache
    onProgress?.('Sinkronisasi gagal. Menggunakan data offline.');
    return {
      siswa: getLocalSiswa(),
      transaksi: getLocalTransaksi(),
    };
  }
};
