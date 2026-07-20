import React, { useState } from 'react';
import { Search, ArrowDownLeft, ArrowUpRight, ReceiptText, ListFilter, Calendar, Landmark, X, Trash2 } from 'lucide-react';
import { Siswa, Transaksi } from '../types';
import { formatRupiah, formatIndonesianDate } from '../utils/helpers';

interface TransaksiListProps {
  siswaList: Siswa[];
  transaksiList: Transaksi[];
  onAddTransaksi: (transaksiData: {
    siswaId: string;
    tipe: 'MASUK' | 'KELUAR';
    jumlah: number;
    keterangan: string;
    tanggal: string;
  }) => void;
  onAddTransaksiBulk?: (transaksiList: {
    siswaId: string;
    tipe: 'MASUK' | 'KELUAR';
    jumlah: number;
    keterangan: string;
    tanggal: string;
  }[]) => void;
  onDeleteTransaksi?: (id: string) => void;
  showForm: boolean;
  onToggleForm: (show: boolean) => void;
  formType: 'MASUK' | 'KELUAR';
  onChangeFormType: (type: 'MASUK' | 'KELUAR') => void;
}

export default function TransaksiList({
  siswaList,
  transaksiList,
  onAddTransaksi,
  onAddTransaksiBulk,
  onDeleteTransaksi,
  showForm,
  onToggleForm,
  formType,
  onChangeFormType
}: TransaksiListProps) {
  const [search, setSearch] = useState('');
  const [tipeFilter, setTipeFilter] = useState<'SEMUA' | 'MASUK' | 'KELUAR'>('SEMUA');
  const [tanggalFilter, setTanggalFilter] = useState('');

  // Form States for New Transaction Form (outside popup)
  const [isMassMode, setIsMassMode] = useState(false);
  const [massTargetType, setMassTargetType] = useState<'SEMUA' | 'KELAS'>('SEMUA');
  const [massTargetKelas, setMassTargetKelas] = useState('');
  const [massCalculationMode, setMassCalculationMode] = useState<'NOMINAL' | 'BAGI_RATA'>('NOMINAL');

  const [selectedSiswaId, setSelectedSiswaId] = useState('');
  const [searchSiswaQuery, setSearchSiswaQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');

  // Extract unique classes for target selection
  const uniqueClasses = Array.from(new Set(siswaList.map(s => s.kelas))).filter(Boolean).sort();

  // Calculation helper for mass transaction
  const getMassPreview = () => {
    let targetedStudents = siswaList;
    if (massTargetType === 'KELAS') {
      targetedStudents = siswaList.filter(s => s.kelas === massTargetKelas);
    }
    const count = targetedStudents.length;
    const rawVal = jumlah.replace(/\D/g, '');
    const numJumlah = rawVal ? Number(rawVal) : 0;
    
    let nominalPerSiswa = numJumlah;
    let totalJumlah = numJumlah * count;
    
    if (massCalculationMode === 'BAGI_RATA') {
      nominalPerSiswa = count > 0 ? Math.round(numJumlah / count) : 0;
      totalJumlah = numJumlah;
    }
    
    return {
      count,
      nominalPerSiswa,
      totalJumlah
    };
  };

  // Format input value as numbers
  const handleJumlahChange = (val: string) => {
    const rawVal = val.replace(/\D/g, '');
    if (rawVal === '') {
      setJumlah('');
      return;
    }
    setJumlah(Number(rawVal).toLocaleString('id-ID'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const numJumlah = Number(jumlah.replace(/\D/g, ''));
    if (!jumlah || isNaN(numJumlah) || numJumlah <= 0) {
      setFormError('Silakan masukkan jumlah uang yang valid.');
      return;
    }

    if (isMassMode) {
      // MASS TRANSACTION MODE
      let targetedStudents = siswaList;
      if (massTargetType === 'KELAS') {
        if (!massTargetKelas) {
          setFormError('Silakan pilih kelas target terlebih dahulu.');
          return;
        }
        targetedStudents = siswaList.filter(s => s.kelas === massTargetKelas);
      }

      if (targetedStudents.length === 0) {
        setFormError('Tidak ada siswa yang cocok dengan kriteria target.');
        return;
      }

      const preview = getMassPreview();
      const finalJumlahPerSiswa = preview.nominalPerSiswa;

      if (finalJumlahPerSiswa <= 0) {
        setFormError('Hasil perhitungan nominal per siswa harus lebih besar dari Rp 0.');
        return;
      }

      // Check balance warnings if it's KELUAR (withdrawal/fee)
      if (formType === 'KELUAR') {
        const withNegativeBalances = targetedStudents.filter(s => (s.saldo || 0) < finalJumlahPerSiswa);
        if (withNegativeBalances.length > 0) {
          const proceed = window.confirm(
            `Peringatan: Terdapat ${withNegativeBalances.length} siswa dengan saldo kurang dari iuran (${formatRupiah(finalJumlahPerSiswa)}). Saldo mereka akan menjadi negatif setelah transaksi ini.\n\nApakah Anda ingin melanjutkan pembuatan transaksi massal ini?`
          );
          if (!proceed) return;
        }
      }

      const bulkList = targetedStudents.map(s => ({
        siswaId: s.id,
        tipe: formType,
        jumlah: finalJumlahPerSiswa,
        keterangan: keterangan || (formType === 'MASUK' ? 'Setor Tabungan Massal' : 'Iuran / Penarikan Massal'),
        tanggal,
      }));

      if (onAddTransaksiBulk) {
        onAddTransaksiBulk(bulkList);
      } else {
        // Fallback if bulk handler not defined
        bulkList.forEach(item => onAddTransaksi(item));
      }

      // Reset Form
      setJumlah('');
      setKeterangan('');
      setTanggal(new Date().toISOString().split('T')[0]);
      onToggleForm(false);

    } else {
      // INDIVIDUAL MODE
      if (!selectedSiswaId) {
        setFormError('Silakan pilih siswa terlebih dahulu.');
        return;
      }

      // Check balance for withdrawals
      if (formType === 'KELUAR') {
        const selectedSiswa = siswaList.find(s => s.id === selectedSiswaId);
        const currentBalance = selectedSiswa?.saldo || 0;
        if (numJumlah > currentBalance) {
          setFormError(`Saldo tidak mencukupi. Tabungan siswa saat ini adalah ${formatRupiah(currentBalance)}.`);
          return;
        }
      }

      onAddTransaksi({
        siswaId: selectedSiswaId,
        tipe: formType,
        jumlah: numJumlah,
        keterangan: keterangan || (formType === 'MASUK' ? 'Setor Tabungan' : 'Penarikan Tabungan'),
        tanggal,
      });

      // Reset Form
      setSelectedSiswaId('');
      setSearchSiswaQuery('');
      setIsDropdownOpen(false);
      setJumlah('');
      setKeterangan('');
      setTanggal(new Date().toISOString().split('T')[0]);
      onToggleForm(false);
    }
  };

  // 1. Prepare transactions with student info
  const enrichedTransactions = transaksiList.map(t => {
    const siswa = siswaList.find(s => s.id === t.siswaId);
    return {
      ...t,
      siswaNama: siswa ? siswa.nama : 'Siswa Tidak Diketahui',
      siswaNisn: siswa ? siswa.nisn : '-',
      siswaKelas: siswa ? siswa.kelas : '-',
    };
  });

  // 2. Sort from newest to oldest
  const sortedTransactions = [...enrichedTransactions].sort(
    (a, b) => new Date(b.tanggalDibuat).getTime() - new Date(a.tanggalDibuat).getTime()
  );

  // 3. Filter transactions
  const filteredTransactions = sortedTransactions.filter(t => {
    const matchesSearch = 
      t.siswaNama.toLowerCase().includes(search.toLowerCase()) ||
      t.siswaNisn.includes(search) ||
      t.keterangan.toLowerCase().includes(search.toLowerCase());
    
    const matchesTipe = tipeFilter === 'SEMUA' || t.tipe === tipeFilter;
    const matchesTanggal = tanggalFilter === '' || t.tanggal === tanggalFilter;

    return matchesSearch && matchesTipe && matchesTanggal;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Riwayat Transaksi Tabungan
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar log penarikan dan setoran tabungan siswa secara keseluruhan.
          </p>
        </div>

        <button
          onClick={() => onToggleForm(!showForm)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
        >
          <span>{showForm ? 'Tutup Form' : 'Tambah Transaksi'}</span>
        </button>
      </div>

      {/* Inline Input Transaksi Baru Form (outside popup) */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/50 rounded-2xl p-5 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 gap-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Landmark className="text-indigo-600 dark:text-indigo-400" size={16} />
              Input Transaksi Baru
            </h3>
            
            {/* Mode Selector */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/55 dark:border-slate-800/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setIsMassMode(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isMassMode
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm border border-slate-200/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Individu
              </button>
              <button
                type="button"
                onClick={() => setIsMassMode(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isMassMode
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm border border-slate-200/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Global / Massal (Iuran)
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Tipe Transaksi */}
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tipe Transaksi</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onChangeFormType('MASUK')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    formType === 'MASUK'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ArrowDownLeft size={14} />
                  {isMassMode ? 'Setor/Masuk' : 'Setor'}
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFormType('KELUAR')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    formType === 'KELUAR'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ArrowUpRight size={14} />
                  {isMassMode ? 'Iuran/Keluar' : 'Tarik'}
                </button>
              </div>
            </div>

            {isMassMode ? (
              /* TARGET GLOBAL/MASSAL (Semua / Kelas) */
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Penerima Manfaat / Target Siswa</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMassTargetType('SEMUA')}
                    className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      massTargetType === 'SEMUA'
                        ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/35 dark:border-indigo-900 dark:text-indigo-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                    }`}
                  >
                    Semua Siswa ({siswaList.length})
                  </button>
                  <div className="relative">
                    <select
                      value={massTargetType === 'KELAS' ? massTargetKelas : ''}
                      onChange={(e) => {
                        setMassTargetType('KELAS');
                        setMassTargetKelas(e.target.value);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold border outline-none cursor-pointer text-center ${
                        massTargetType === 'KELAS'
                          ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/35 dark:border-indigo-900 dark:text-indigo-300'
                          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                      }`}
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {uniqueClasses.map(c => (
                        <option key={c} value={c}>
                          Kelas {c} ({siswaList.filter(s => s.kelas === c).length} siswa)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* INDIVIDUAL SELECTOR */
              <div className="space-y-1.5 lg:col-span-2 relative">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih Siswa</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari nama siswa, kelas, atau NISN..."
                    value={searchSiswaQuery}
                    onChange={(e) => {
                      setSearchSiswaQuery(e.target.value);
                      setIsDropdownOpen(true);
                      if (e.target.value === '') {
                        setSelectedSiswaId('');
                      }
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full pl-3 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-50 font-medium placeholder-slate-400"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {selectedSiswaId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSiswaId('');
                          setSearchSiswaQuery('');
                          setIsDropdownOpen(true);
                        }}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        title="Bersihkan pilihan"
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <Search size={14} className="text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Dropdown Options */}
                {isDropdownOpen && (
                  <>
                    {/* Backdrop overlay to catch click-outside and close dropdown */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsDropdownOpen(false)} 
                    />
                    
                    <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-60 overflow-y-auto z-20 divide-y divide-slate-50 dark:divide-slate-800/60 animate-in fade-in slide-in-from-top-1 duration-100">
                      {siswaList
                        .filter(s => {
                          const q = searchSiswaQuery.toLowerCase();
                          return (
                            s.nama.toLowerCase().includes(q) ||
                            s.nisn.includes(q) ||
                            s.kelas.toLowerCase().includes(q)
                          );
                        })
                        .map(s => {
                          const isSelected = s.id === selectedSiswaId;
                          return (
                            <div
                              key={s.id}
                              onClick={() => {
                                setSelectedSiswaId(s.id);
                                setSearchSiswaQuery(`${s.nama} (${s.kelas})`);
                                setIsDropdownOpen(false);
                              }}
                              className={`p-3 flex items-center justify-between cursor-pointer text-xs transition-colors ${
                                isSelected 
                                  ? 'bg-indigo-50/55 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold' 
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-lg font-bold text-[10px] flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                  {s.nama.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold">{s.nama}</p>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">NISN: {s.nisn} • Kelas: {s.kelas}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Saldo</p>
                                <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{formatRupiah(s.saldo || 0)}</p>
                              </div>
                            </div>
                          );
                        })}
                      {siswaList.filter(s => {
                        const q = searchSiswaQuery.toLowerCase();
                        return (
                          s.nama.toLowerCase().includes(q) ||
                          s.nisn.includes(q) ||
                          s.kelas.toLowerCase().includes(q)
                        );
                      }).length === 0 && (
                        <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
                          <Search size={16} className="text-slate-300 dark:text-slate-700" />
                          <span>Siswa tidak ditemukan</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Metode Pengisian Nominal (Hanya muncul saat mode massal) */}
            {isMassMode && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Metode Pengisian Nominal</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setMassCalculationMode('NOMINAL')}
                    className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      massCalculationMode === 'NOMINAL'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Per Siswa
                  </button>
                  <button
                    type="button"
                    onClick={() => setMassCalculationMode('BAGI_RATA')}
                    className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      massCalculationMode === 'BAGI_RATA'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Bagi Rata (Total)
                  </button>
                </div>
              </div>
            )}

            {/* Jumlah Uang */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isMassMode && massCalculationMode === 'BAGI_RATA'
                  ? 'Total Iuran Kelas (Akan Dibagi Rata)'
                  : 'Jumlah (Rupiah per Siswa)'}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-bold text-slate-400 text-xs">Rp</span>
                <input
                  type="text"
                  placeholder="0"
                  value={jumlah}
                  onChange={(e) => handleJumlahChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-50 font-bold"
                />
              </div>

              {isMassMode && (
                <div className="mt-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/40 rounded-xl p-2.5 text-[11px] text-slate-600 dark:text-slate-400 space-y-1 animate-in fade-in slide-in-from-top-1 duration-100">
                  <div className="flex justify-between">
                    <span>Jumlah Siswa Target:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{getMassPreview().count} siswa</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nominal per Siswa:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatRupiah(getMassPreview().nominalPerSiswa)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-800/80 pt-1 mt-1 font-semibold text-[10px] uppercase tracking-wider">
                    <span>Total {formType === 'MASUK' ? 'Setoran' : 'Iuran/Tarik'}:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-mono font-bold">{formatRupiah(getMassPreview().totalJumlah)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Keterangan */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Keterangan {isMassMode ? '' : '(Opsional)'}</label>
              <input
                type="text"
                placeholder={isMassMode 
                  ? (formType === 'MASUK' ? 'Misal: Iuran Kas Kelas (Masuk)' : 'Misal: Iuran Pramuka / Kas Bulanan')
                  : (formType === 'MASUK' ? 'Setor Tabungan' : 'Penarikan Tabungan')
                }
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-50"
                required={isMassMode}
              />
            </div>

            {/* Tanggal */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tanggal Transaksi</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-50 dark:[color-scheme:dark]"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2.5 pt-2 border-t border-slate-50 dark:border-slate-800/80">
              {formError && (
                <div className="mr-auto self-center text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {formError}
                </div>
              )}
              <button
                type="button"
                onClick={() => onToggleForm(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-lg text-xs font-bold text-white shadow-md cursor-pointer ${
                  formType === 'MASUK'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'
                }`}
              >
                Simpan Transaksi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Search */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NISN, atau keterangan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-transparent outline-none border-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2">
            <ListFilter size={14} className="text-slate-400" />
            <select
              value={tipeFilter}
              onChange={(e) => setTipeFilter(e.target.value as any)}
              className="w-full text-xs bg-transparent outline-none border-none text-slate-600 dark:text-slate-300 font-semibold cursor-pointer dark:[color-scheme:dark] dark:text-slate-200"
            >
              <option value="SEMUA" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Semua Jenis Transaksi</option>
              <option value="MASUK" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Uang Masuk (Setoran)</option>
              <option value="KELUAR" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Uang Keluar (Penarikan)</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              value={tanggalFilter}
              onChange={(e) => setTanggalFilter(e.target.value)}
              className="w-full text-xs bg-transparent outline-none border-none text-slate-600 dark:text-slate-300 font-semibold cursor-pointer dark:[color-scheme:dark] dark:text-slate-200"
            />
          </div>

        </div>

        {/* Clear filters shortcut */}
        {(search || tipeFilter !== 'SEMUA' || tanggalFilter) && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSearch('');
                setTipeFilter('SEMUA');
                setTanggalFilter('');
              }}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
            >
              Bersihkan Filter
            </button>
          </div>
        )}
      </div>

      {/* Transaction List Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Desktop Table view (Visible on Medium and up screens) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Siswa</th>
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4 text-right">Jumlah</th>
                <th className="px-6 py-4 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {formatIndonesianDate(t.tanggal)}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{t.siswaNama}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">NISN: {t.siswaNisn}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">
                      {t.siswaKelas}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                      {t.keterangan}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        t.tipe === 'MASUK'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                      }`}>
                        {t.tipe === 'MASUK' ? (
                          <>
                            <ArrowDownLeft size={12} />
                            <span>Setor</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight size={12} />
                            <span>Tarik</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold font-mono ${
                        t.tipe === 'MASUK'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {t.tipe === 'MASUK' ? '+' : '-'} {formatRupiah(t.jumlah)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {onDeleteTransaksi && (
                        <button
                          onClick={() => onDeleteTransaksi(t.id)}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center"
                          title="Hapus Transaksi"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ReceiptText size={32} className="text-slate-300" />
                      <span>Tidak ada transaksi yang cocok dengan filter pencarian.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards List View (Visible on Small screens) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/50">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map(t => (
              <div key={t.id} className="p-4 space-y-2 text-sm">
                <div className="flex justify-between items-start">
                  <div className="max-w-[70%]">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200">{t.siswaNama}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      NISN: {t.siswaNisn} • Kelas: {t.siswaKelas}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.tipe === 'MASUK'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                    }`}>
                      {t.tipe === 'MASUK' ? 'Setor' : 'Tarik'}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <div className="space-y-0.5 text-slate-500 dark:text-slate-400 max-w-[60%]">
                    <p className="italic truncate">"{t.keterangan}"</p>
                    <p className="text-[10px] text-slate-400 font-mono">{formatIndonesianDate(t.tanggal)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm font-mono ${
                      t.tipe === 'MASUK'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {t.tipe === 'MASUK' ? '+' : '-'} {formatRupiah(t.jumlah)}
                    </span>
                    {onDeleteTransaksi && (
                      <button
                        onClick={() => onDeleteTransaksi(t.id)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center"
                        title="Hapus Transaksi"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <ReceiptText size={32} className="text-slate-300" />
              <span>Tidak ada transaksi yang ditemukan.</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
