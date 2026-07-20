import React, { useState } from 'react';
import { 
  UserPlus, 
  Search, 
  Landmark, 
  ChevronDown, 
  ChevronUp, 
  History, 
  ListFilter, 
  GraduationCap,
  Edit,
  Trash2,
  X,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Info,
  ArrowUpDown
} from 'lucide-react';
import { Siswa, Transaksi } from '../types';
import { formatRupiah, formatIndonesianDate } from '../utils/helpers';

interface SiswaListProps {
  siswaList: Siswa[];
  transaksiList: Transaksi[];
  onAddSiswa: (siswaData: { nisn: string; nama: string; kelas: string }) => void;
  onEditSiswa: (id: string, siswaData: { nisn: string; nama: string; kelas: string }) => void;
  onDeleteSiswa: (id: string) => void;
}

export default function SiswaList({
  siswaList,
  transaksiList,
  onAddSiswa,
  onEditSiswa,
  onDeleteSiswa
}: SiswaListProps) {
  const [search, setSearch] = useState('');
  const [kelasFilter, setKelasFilter] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'name-desc' | 'saldo-desc' | 'saldo-asc'>('default');
  const [showAddForm, setShowAddForm] = useState(false);
  const [nisn, setNisn] = useState('');
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [formError, setFormError] = useState('');
  const [expandedSiswaId, setExpandedSiswaId] = useState<string | null>(null);

  // Modal States
  const [detailSiswa, setDetailSiswa] = useState<Siswa | null>(null);
  const [editSiswa, setEditSiswa] = useState<Siswa | null>(null);
  const [deleteSiswa, setDeleteSiswa] = useState<Siswa | null>(null);

  // Edit Form State
  const [editNisn, setEditNisn] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editError, setEditError] = useState('');

  // Form Submission for New Siswa
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nisn.trim() || !nama.trim() || !kelas.trim()) {
      setFormError('Semua input wajib diisi.');
      return;
    }

    if (nisn.length < 5 || isNaN(Number(nisn))) {
      setFormError('NISN harus berupa angka dan minimal 5 karakter.');
      return;
    }

    // Check duplicate NISN
    const isDuplicate = siswaList.some(s => s.nisn === nisn.trim());
    if (isDuplicate) {
      setFormError('Siswa dengan NISN tersebut sudah terdaftar.');
      return;
    }

    onAddSiswa({
      nisn: nisn.trim(),
      nama: nama.trim().toUpperCase(),
      kelas: kelas.trim().toUpperCase(),
    });

    // Reset Form
    setNisn('');
    setNama('');
    setKelas('');
    setShowAddForm(false);
  };

  // Open Edit Modal
  const handleOpenEdit = (siswa: Siswa) => {
    setEditSiswa(siswa);
    setEditNisn(siswa.nisn);
    setEditNama(siswa.nama);
    setEditKelas(siswa.kelas);
    setEditError('');
  };

  // Handle Edit Save
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editNisn.trim() || !editNama.trim() || !editKelas.trim()) {
      setEditError('Semua input wajib diisi.');
      return;
    }

    if (editNisn.length < 5 || isNaN(Number(editNisn))) {
      setEditError('NISN harus berupa angka dan minimal 5 karakter.');
      return;
    }

    // Check duplicate NISN except current student
    const isDuplicate = siswaList.some(s => s.nisn === editNisn.trim() && s.id !== editSiswa?.id);
    if (isDuplicate) {
      setEditError('Siswa dengan NISN tersebut sudah terdaftar.');
      return;
    }

    if (editSiswa) {
      onEditSiswa(editSiswa.id, {
        nisn: editNisn.trim(),
        nama: editNama.trim().toUpperCase(),
        kelas: editKelas.trim().toUpperCase()
      });
      setEditSiswa(null);
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = () => {
    if (deleteSiswa) {
      onDeleteSiswa(deleteSiswa.id);
      setDeleteSiswa(null);
      // Close expanded section if deleted student was expanded
      if (expandedSiswaId === deleteSiswa.id) {
        setExpandedSiswaId(null);
      }
    }
  };

  // Helper to sort class from lowest to highest
  const classToNumber = (c: string): number => {
    const clean = (c || '').trim().toUpperCase();
    if (clean === 'VII' || clean === '7') return 7;
    if (clean === 'VIII' || clean === '8') return 8;
    if (clean === 'IX' || clean === '9') return 9;
    const parsed = parseInt(clean);
    if (!isNaN(parsed)) return parsed;
    return 99; // unknown class goes last
  };

  // Filter & Search Siswa
  const filteredSiswa = siswaList.filter(s => {
    const matchesSearch = 
      s.nama.toLowerCase().includes(search.toLowerCase()) ||
      s.nisn.includes(search);
    const matchesKelas = kelasFilter === '' || s.kelas === kelasFilter;
    return matchesSearch && matchesKelas;
  });

  // Sort Siswa
  const sortedSiswa = [...filteredSiswa].sort((a, b) => {
    if (sortBy === 'default') {
      const classA = classToNumber(a.kelas);
      const classB = classToNumber(b.kelas);
      if (classA !== classB) {
        return classA - classB;
      }
      return a.nama.localeCompare(b.nama);
    }
    if (sortBy === 'name-asc') {
      return a.nama.localeCompare(b.nama);
    }
    if (sortBy === 'name-desc') {
      return b.nama.localeCompare(a.nama);
    }
    if (sortBy === 'saldo-desc') {
      return (b.saldo || 0) - (a.saldo || 0);
    }
    if (sortBy === 'saldo-asc') {
      return (a.saldo || 0) - (b.saldo || 0);
    }
    return 0;
  });

  // Get list of unique classes for filter dropdown
  const uniqueClasses = Array.from(new Set(siswaList.map(s => s.kelas))).sort();

  // Get transaction ledger of a specific student
  const getSiswaTransactions = (siswaId: string) => {
    return transaksiList
      .filter(t => t.siswaId === siswaId)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Daftar Siswa SMP
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola data profil siswa, pantau total tabungan, serta lakukan ubah dan hapus data.
          </p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
        >
          <UserPlus size={15} />
          <span>Tambah Siswa</span>
        </button>
      </div>

      {/* Inline Registration Collapsible Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/50 rounded-2xl p-5 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-150">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <GraduationCap className="text-indigo-600 dark:text-indigo-400" size={16} />
            Registrasi Siswa Baru
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">NISN (Nomor Induk Siswa Nasional)</label>
              <input
                type="text"
                placeholder="Masukkan NISN siswa"
                value={nisn}
                onChange={(e) => setNisn(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nama Lengkap</label>
              <input
                type="text"
                placeholder="Masukkan nama lengkap"
                value={nama}
                onChange={(e) => setNama(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kelas</label>
              <select
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-50 cursor-pointer dark:[color-scheme:dark] dark:text-slate-200"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-400">Pilih Kelas</option>
                <option value="VII" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">VII</option>
                <option value="VIII" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">VIII</option>
                <option value="IX" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">IX</option>
              </select>
            </div>

            <div className="md:col-span-3 flex justify-end gap-2.5 pt-2 border-t border-slate-50 dark:border-slate-800/80">
              {formError && (
                <div className="mr-auto self-center text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {formError}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Simpan Profil
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau NISN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-transparent outline-none border-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 sm:w-48">
          <ListFilter size={14} className="text-slate-400" />
          <select
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            className="w-full text-xs bg-transparent outline-none border-none text-slate-600 dark:text-slate-300 font-semibold cursor-pointer dark:[color-scheme:dark] dark:text-slate-200"
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Semua Kelas</option>
            {uniqueClasses.map(k => (
              <option key={k} value={k} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Kelas {k}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 sm:w-56">
          <ArrowUpDown size={14} className="text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full text-xs bg-transparent outline-none border-none text-slate-600 dark:text-slate-300 font-semibold cursor-pointer dark:[color-scheme:dark] dark:text-slate-200"
          >
            <option value="default" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Default (Kelas & Nama A-Z)</option>
            <option value="name-asc" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Nama (A - Z)</option>
            <option value="name-desc" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Nama (Z - A)</option>
            <option value="saldo-desc" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Saldo (Tertinggi)</option>
            <option value="saldo-asc" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Saldo (Terendah)</option>
          </select>
        </div>
      </div>

      {/* Student List Grid */}
      <div className="space-y-2.5">
        {sortedSiswa.length > 0 ? (
          sortedSiswa.map(siswa => {
            const isExpanded = expandedSiswaId === siswa.id;
            const transactions = getSiswaTransactions(siswa.id);
            
            return (
              <div 
                key={siswa.id} 
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm transition-all animate-in fade-in duration-100"
              >
                {/* Main Card View */}
                <div 
                  onClick={() => setExpandedSiswaId(isExpanded ? null : siswa.id)}
                  className="px-3 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                      {siswa.nama.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-slate-50 text-xs sm:text-sm truncate">
                        {siswa.nama}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                        NISN: {siswa.nisn} • Kelas: <span className="font-semibold text-slate-600 dark:text-slate-300">{siswa.kelas}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                    <div className="text-right">
                      <p className="text-[9px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold">
                        Saldo
                      </p>
                      <p className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                        {formatRupiah(siswa.saldo || 0)}
                      </p>
                    </div>
                    
                    <span className="text-slate-400 shrink-0">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </div>
                </div>

                {/* Expanded Individual Ledger View */}
                {isExpanded && (() => {
                  const totalMasuk = transactions.filter(t => t.tipe === 'MASUK').reduce((sum, t) => sum + t.jumlah, 0);
                  const totalKeluar = transactions.filter(t => t.tipe === 'KELUAR').reduce((sum, t) => sum + t.jumlah, 0);
                  const saldoAkhir = siswa.saldo || 0;

                  return (
                    <div className="bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-50 dark:border-slate-800 p-3 sm:p-5 space-y-3 sm:space-y-4 animate-in slide-in-from-top-2 duration-100">
                      <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <History size={12} />
                          Ringkasan Tabungan Pribadi
                        </span>
                        <span>{transactions.length} Transaksi</span>
                      </div>

                      {/* 3-Column Financial Summary Grid */}
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-center">
                        <div className="bg-emerald-50/60 dark:bg-emerald-950/15 border border-emerald-100/50 dark:border-emerald-900/30 p-2 sm:p-3.5 rounded-xl">
                          <p className="text-[8px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Total Masuk</p>
                          <p className="font-bold text-[10px] sm:text-sm text-emerald-700 dark:text-emerald-300 mt-0.5 font-mono truncate">{formatRupiah(totalMasuk)}</p>
                        </div>
                        
                        <div className="bg-rose-50/60 dark:bg-rose-950/15 border border-rose-100/50 dark:border-rose-900/30 p-2 sm:p-3.5 rounded-xl">
                          <p className="text-[8px] sm:text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">Total Keluar</p>
                          <p className="font-bold text-[10px] sm:text-sm text-rose-700 dark:text-rose-300 mt-0.5 font-mono truncate">{formatRupiah(totalKeluar)}</p>
                        </div>

                        <div className="bg-indigo-50/60 dark:bg-indigo-950/15 border border-indigo-100/50 dark:border-indigo-900/30 p-2 sm:p-3.5 rounded-xl">
                          <p className="text-[8px] sm:text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Saldo Akhir</p>
                          <p className="font-bold text-[10px] sm:text-sm text-indigo-700 dark:text-indigo-300 mt-0.5 font-mono truncate">{formatRupiah(saldoAkhir)}</p>
                        </div>
                      </div>

                      {/* Quick Control Action Panel */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                        <button
                          onClick={() => setDetailSiswa(siswa)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-lg transition-all cursor-pointer"
                          title="Lihat detail & semua riwayat"
                        >
                          <Info size={13} />
                          <span>Detail Lengkap</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(siswa)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-all cursor-pointer"
                          title="Edit Profil"
                        >
                          <Edit size={13} />
                          <span>Edit Profil</span>
                        </button>
                        <button
                          onClick={() => setDeleteSiswa(siswa)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-lg transition-all cursor-pointer"
                          title="Hapus Siswa"
                        >
                          <Trash2 size={13} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-slate-400 flex flex-col items-center justify-center">
            <GraduationCap size={40} className="text-slate-300 dark:text-slate-700 mb-2" />
            <span className="text-sm font-semibold">Siswa tidak ditemukan</span>
            <span className="text-xs text-slate-400">Silakan tambahkan siswa baru atau periksa filter pencarian.</span>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {detailSiswa && (() => {
        const studentTx = getSiswaTransactions(detailSiswa.id);
        const totalMasuk = studentTx.filter(t => t.tipe === 'MASUK').reduce((sum, t) => sum + t.jumlah, 0);
        const totalKeluar = studentTx.filter(t => t.tipe === 'KELUAR').reduce((sum, t) => sum + t.jumlah, 0);
        
        return (
          <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-100">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in scale-in duration-150">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                    {detailSiswa.nama.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      Detail Profil & Tabungan
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Siswa: {detailSiswa.nama}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailSiswa(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1">
                
                {/* Profile Grid */}
                <div className="grid grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-800/80 rounded-xl text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">NISN</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{detailSiswa.nisn}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Kelas</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">Kelas {detailSiswa.kelas}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400 font-medium flex items-center gap-1">
                      <Calendar size={12} />
                      Tanggal Terdaftar
                    </p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {detailSiswa.tanggalDibuat ? formatIndonesianDate(detailSiswa.tanggalDibuat) : '-'}
                    </p>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 p-3 rounded-xl">
                    <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Total Masuk</p>
                    <p className="font-bold text-xs text-emerald-700 dark:text-emerald-300 mt-1 font-mono">{formatRupiah(totalMasuk)}</p>
                  </div>
                  
                  <div className="bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20 p-3 rounded-xl">
                    <p className="text-[9px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">Total Keluar</p>
                    <p className="font-bold text-xs text-rose-700 dark:text-rose-300 mt-1 font-mono">{formatRupiah(totalKeluar)}</p>
                  </div>

                  <div className="bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 p-3 rounded-xl">
                    <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Saldo Akhir</p>
                    <p className="font-bold text-xs text-indigo-700 dark:text-indigo-300 mt-1 font-mono">{formatRupiah(detailSiswa.saldo || 0)}</p>
                  </div>
                </div>

                {/* Complete Transaction History */}
                <div className="space-y-2.5">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-300 flex items-center justify-between">
                    <span>Semua Riwayat Transaksi</span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-semibold">{studentTx.length} Transaksi</span>
                  </h4>

                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto bg-white dark:bg-slate-900">
                    {studentTx.length > 0 ? (
                      studentTx.map(t => (
                        <div key={t.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/40 dark:hover:bg-slate-950/10 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${
                              t.tipe === 'MASUK' 
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' 
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                            }`}>
                              {t.tipe === 'MASUK' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{t.keterangan}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{formatIndonesianDate(t.tanggal)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold ${
                              t.tipe === 'MASUK' 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {t.tipe === 'MASUK' ? '+' : '-'} {formatRupiah(t.jumlah)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                        <Landmark size={24} className="text-slate-300 dark:text-slate-700" />
                        <span>Siswa ini belum memiliki transaksi apa pun.</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailSiswa(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* EDIT MODAL */}
      {editSiswa && (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col animate-in scale-in duration-150">
            
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit className="text-indigo-600 dark:text-indigo-400" size={16} />
                Edit Profil Siswa
              </h3>
              <button
                onClick={() => setEditSiswa(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="p-5 space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">NISN</label>
                  <input
                    type="text"
                    value={editNisn}
                    onChange={(e) => setEditNisn(e.target.value.replace(/\D/g, ''))}
                    placeholder="Masukkan NISN siswa"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nama Lengkap</label>
                  <input
                    type="text"
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value.toUpperCase())}
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kelas</label>
                  <select
                    value={editKelas}
                    onChange={(e) => setEditKelas(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-50 cursor-pointer dark:[color-scheme:dark] dark:text-slate-200"
                  >
                    <option value="VII" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">VII</option>
                    <option value="VIII" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">VIII</option>
                    <option value="IX" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">IX</option>
                  </select>
                </div>

              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 flex items-center justify-end gap-2">
                {editError && (
                  <div className="mr-auto text-xs text-rose-600 dark:text-rose-400 font-medium max-w-48 truncate">
                    {editError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setEditSiswa(null)}
                  className="px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteSiswa && (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col animate-in scale-in duration-150">
            
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="text-rose-500" size={16} />
                Konfirmasi Hapus Siswa
              </h3>
              <button
                onClick={() => setDeleteSiswa(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Apakah Anda benar-benar yakin ingin menghapus data siswa <span className="font-bold text-slate-900 dark:text-slate-50">{deleteSiswa.nama}</span>?
              </p>
              
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/50 rounded-xl flex items-start gap-3">
                <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={16} />
                <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed font-medium">
                  Tindakan ini akan menghapus profil siswa ini serta <span className="font-bold">semua riwayat transaksi tabungannya</span> secara permanen dari penyimpanan lokal dan Google Sheets. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteSiswa(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/10 cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
