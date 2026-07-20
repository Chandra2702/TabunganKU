import { ArrowDownLeft, ArrowUpRight, Users, Landmark, Plus, Minus, ReceiptText, TrendingUp, Calendar } from 'lucide-react';
import { Siswa, Transaksi } from '../types';
import { formatRupiah, formatIndonesianDate } from '../utils/helpers';

interface DashboardProps {
  siswaList: Siswa[];
  transaksiList: Transaksi[];
  onOpenInputModal: (type: 'MASUK' | 'KELUAR') => void;
  onNavigateToTab: (tab: string) => void;
}

export default function Dashboard({
  siswaList,
  transaksiList,
  onOpenInputModal,
  onNavigateToTab
}: DashboardProps) {
  // 1. Calculations
  const totalSiswa = siswaList.length;
  
  const totalUangMasuk = transaksiList
    .filter(t => t.tipe === 'MASUK')
    .reduce((sum, t) => sum + t.jumlah, 0);

  const totalUangKeluar = transaksiList
    .filter(t => t.tipe === 'KELUAR')
    .reduce((sum, t) => sum + t.jumlah, 0);

  const totalTabungan = totalUangMasuk - totalUangKeluar;

  // 2. Get 5 recent transactions
  const recentTransactions = [...transaksiList]
    .sort((a, b) => new Date(b.tanggalDibuat).getTime() - new Date(a.tanggalDibuat).getTime())
    .slice(0, 5)
    .map(t => {
      const siswa = siswaList.find(s => s.id === t.siswaId);
      return {
        ...t,
        siswaNama: siswa ? siswa.nama : 'Siswa Terhapus/Tidak Diketahui',
        siswaKelas: siswa ? siswa.kelas : '-',
      };
    });

  // 3. Weekly trend (Last 7 days breakdown for chart)
  const getLast7DaysData = () => {
    const result = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      
      const dayTransactions = transaksiList.filter(t => t.tanggal === dateString);
      const masuk = dayTransactions.filter(t => t.tipe === 'MASUK').reduce((s, t) => s + t.jumlah, 0);
      const keluar = dayTransactions.filter(t => t.tipe === 'KELUAR').reduce((s, t) => s + t.jumlah, 0);
      
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      
      result.push({
        date: dateString,
        dayName,
        masuk,
        keluar,
      });
    }
    return result;
  };

  const chartData = getLast7DaysData();
  const maxVal = Math.max(...chartData.flatMap(d => [d.masuk, d.keluar]), 100000);

  return (
    <div className="space-y-6">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Halo, Bapak/Ibu Guru 👋
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Selamat datang di Sistem Administrasi Tabungan Siswa SMP.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 font-medium">
          <Calendar size={14} />
          <span>Hari ini: {formatIndonesianDate(new Date().toISOString().split('T')[0])}</span>
        </div>
      </div>

      {/* Main Stats Widget Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Tabungan */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-lg shadow-emerald-600/10 relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] text-white/10">
            <Landmark size={120} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Total Tabungan Aktif
            </span>
            <span className="bg-white/20 p-1.5 rounded-lg">
              <Landmark size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight">
              {formatRupiah(totalTabungan)}
            </h3>
            <p className="text-xs text-emerald-100 mt-1.5 flex items-center gap-1">
              <TrendingUp size={12} />
              <span>Bersih dari semua siswa</span>
            </p>
          </div>
        </div>

        {/* Jumlah Siswa */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Jumlah Siswa
            </span>
            <span className="bg-slate-50 dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 p-1.5 rounded-lg">
              <Users size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {totalSiswa} Siswa
            </h3>
            <button 
              onClick={() => onNavigateToTab('siswa')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mt-1.5 block cursor-pointer"
            >
              Kelola siswa →
            </button>
          </div>
        </div>

        {/* Total Uang Masuk */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Uang Masuk (Setoran)
            </span>
            <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg">
              <ArrowDownLeft size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatRupiah(totalUangMasuk)}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              Akumulasi setoran masuk
            </p>
          </div>
        </div>

        {/* Total Uang Keluar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Uang Keluar (Penarikan)
            </span>
            <span className="bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 p-1.5 rounded-lg">
              <ArrowUpRight size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatRupiah(totalUangKeluar)}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              Akumulasi penarikan keluar
            </p>
          </div>
        </div>

      </div>

      {/* Quick Action Buttons */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Akses Cepat Transaksi
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onOpenInputModal('MASUK')}
            className="flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-300 font-bold text-sm transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Plus size={18} />
            <span>Setor Uang Masuk</span>
          </button>
          <button
            onClick={() => onOpenInputModal('KELUAR')}
            className="flex items-center justify-center gap-2 py-3.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 font-bold text-sm transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Minus size={18} />
            <span>Tarik Uang Keluar</span>
          </button>
        </div>
      </div>

      {/* Chart and Recent List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Simple Bar Chart (Tailwind Powered) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">
            Tren Tabungan 7 Hari Terakhir
          </h3>
          <div className="h-48 flex items-end justify-between gap-2 pt-6 px-2">
            {chartData.map((d, idx) => {
              const hMasuk = (d.masuk / maxVal) * 100;
              const hKeluar = (d.keluar / maxVal) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex justify-center gap-1.5 h-36 items-end">
                    {/* Bar Masuk */}
                    <div 
                      style={{ height: `${Math.max(hMasuk, 4)}%` }}
                      className="w-3 sm:w-4 bg-emerald-500 dark:bg-emerald-600 rounded-t-sm relative group cursor-help transition-all duration-300 hover:opacity-85"
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded whitespace-nowrap shadow-md z-10 font-bold">
                        Masuk: {formatRupiah(d.masuk)}
                      </div>
                    </div>
                    {/* Bar Keluar */}
                    <div 
                      style={{ height: `${Math.max(hKeluar, 4)}%` }}
                      className="w-3 sm:w-4 bg-rose-500 dark:bg-rose-600 rounded-t-sm relative group cursor-help transition-all duration-300 hover:opacity-85"
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded whitespace-nowrap shadow-md z-10 font-bold">
                        Keluar: {formatRupiah(d.keluar)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {d.dayName}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Chart Legends */}
          <div className="flex items-center justify-center gap-6 mt-6 border-t border-slate-50 dark:border-slate-800/80 pt-4 text-xs font-medium">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="w-3 h-3 bg-emerald-500 dark:bg-emerald-600 rounded-sm"></span>
              <span>Uang Masuk (Setoran)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="w-3 h-3 bg-rose-500 dark:bg-rose-600 rounded-sm"></span>
              <span>Uang Keluar (Penarikan)</span>
            </div>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Transaksi Terakhir
            </h3>
            <button 
              onClick={() => onNavigateToTab('transaksi')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
            >
              Semua →
            </button>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50 flex-1 overflow-y-auto max-h-56">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {t.siswaNama}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{t.siswaKelas}</span>
                      <span>•</span>
                      <span className="truncate max-w-[120px]">{t.keterangan}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold flex items-center gap-0.5 justify-end ${
                      t.tipe === 'MASUK' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {t.tipe === 'MASUK' ? '+' : '-'} {formatRupiah(t.jumlah)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {t.tanggal}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8 text-slate-400 text-xs">
                <ReceiptText size={24} className="text-slate-300 mb-2" />
                <span>Belum ada transaksi terekam.</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
