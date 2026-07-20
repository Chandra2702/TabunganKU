export interface Siswa {
  id: string;
  nisn: string;
  nama: string;
  kelas: string;
  tanggalDibuat: string;
  saldo?: number; // computed locally
}

export interface Transaksi {
  id: string;
  siswaId: string;
  tipe: 'MASUK' | 'KELUAR';
  jumlah: number;
  keterangan: string;
  tanggal: string; // YYYY-MM-DD
  tanggalDibuat: string;
}

export interface SyncQueueItem {
  id: string;
  action: 'CREATE_SISWA' | 'CREATE_TRANSAKSI';
  data: any;
  timestamp: number;
}

export type ReportType = 'daily' | 'weekly' | 'monthly';
