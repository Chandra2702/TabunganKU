import React, { useState, useEffect } from 'react';
import { 
  Building, 
  ArrowUpCircle, 
  Check, 
  HelpCircle, 
  Users, 
  Sparkles, 
  ChevronRight, 
  AlertTriangle, 
  RefreshCw,
  Award
} from 'lucide-react';
import { Siswa } from '../types';
import { getSuggestedNextClass } from '../utils/helpers';

interface PengaturanProps {
  schoolName: string;
  onUpdateSchoolName: (name: string) => void;
  siswaList: Siswa[];
  onPromoteSiswa: (mappings: Record<string, string>) => void;
  isSyncing: boolean;
}

export default function Pengaturan({
  schoolName,
  onUpdateSchoolName,
  siswaList,
  onPromoteSiswa,
  isSyncing
}: PengaturanProps) {
  // School name local state
  const [localSchoolName, setLocalSchoolName] = useState(schoolName);
  const [isSaved, setIsSaved] = useState(false);

  // Sync localSchoolName if prop changes
  useEffect(() => {
    setLocalSchoolName(schoolName);
  }, [schoolName]);

  const handleSaveSchoolName = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSchoolName(localSchoolName.trim() || 'SMP Negeri Indonesia');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Class Promotion State
  const [uniqueClasses, setUniqueClasses] = useState<string[]>([]);
  const [classMappings, setClassMappings] = useState<Record<string, string>>({});
  const [isConfirming, setIsConfirming] = useState(false);

  // Initialize unique classes and default mappings
  useEffect(() => {
    const classes = Array.from(new Set(siswaList.map(s => s.kelas.trim())))
      .filter(Boolean)
      .sort();
    
    setUniqueClasses(classes);

    const initialMappings: Record<string, string> = {};
    classes.forEach(cls => {
      initialMappings[cls] = getSuggestedNextClass(cls);
    });
    setClassMappings(initialMappings);
  }, [siswaList]);

  // Handle mapping input change
  const handleMappingChange = (fromClass: string, toClass: string) => {
    setClassMappings(prev => ({
      ...prev,
      [fromClass]: toClass
    }));
  };

  // Run bulk promotion trigger
  const handlePromoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirming(true);
  };

  const handleConfirmPromote = () => {
    onPromoteSiswa(classMappings);
    setIsConfirming(false);
    
    // Show browser success notification
    alert('Kenaikan kelas massal berhasil diproses dan disimpan!');
  };

  // Preview counts
  const totalStudents = siswaList.length;
  // Exclude those already graduated if any
  const activeStudents = siswaList.filter(s => s.kelas.toUpperCase() !== 'LULUS').length;

  return (
    <div className="space-y-8 max-w-4xl" id="pengaturan-container">
      
      {/* Header section */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
          Pengaturan Sistem
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Kelola informasi sekolah dan lakukan pemeliharaan data tahunan seperti kenaikan kelas siswa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: School Settings */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Building size={18} />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-50">
                Identitas Sekolah
              </h3>
            </div>

            <form onSubmit={handleSaveSchoolName} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Lembaga / Sekolah
                </label>
                <input
                  type="text"
                  required
                  value={localSchoolName}
                  onChange={(e) => setLocalSchoolName(e.target.value)}
                  placeholder="Contoh: SMP Negeri 1 Jakarta"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10 active:scale-95 cursor-pointer"
              >
                {isSaved ? (
                  <>
                    <Check size={14} className="stroke-[3px]" />
                    <span>Tersimpan</span>
                  </>
                ) : (
                  <span>Simpan Perubahan</span>
                )}
              </button>
            </form>
          </div>

          <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-slate-200 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <Award size={20} className="text-yellow-400" />
              <h4 className="font-extrabold text-sm text-white">Panduan Kenaikan</h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Kenaikan kelas idealnya dilakukan sekali setahun pada akhir semester genap. 
              Sistem akan memetakan semua siswa di kelas tertentu ke kelas baru berdasarkan konfigurasi Anda.
            </p>
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] space-y-1">
              <p className="text-white font-bold">Aturan Otomatis Terdeteksi:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                <li>Kelas VII otomatis naik ke VIII</li>
                <li>Kelas VIII otomatis naik ke IX</li>
                <li>Kelas IX otomatis ke status <strong>LULUS</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Class Promotion Control */}
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-md">
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <ArrowUpCircle size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-50">
                    Kenaikan Kelas Massal
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Gunakan panel ini untuk menaikkan jenjang seluruh siswa secara serentak.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-slate-600 dark:text-slate-300">
                {totalStudents} Siswa Terdaftar
              </span>
            </div>

            {uniqueClasses.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Users className="mx-auto text-slate-300 dark:text-slate-700" size={40} />
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Belum ada data kelas yang terdeteksi di dalam database. Tambahkan data siswa terlebih dahulu di tab <strong>Data Siswa</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePromoteSubmit} className="space-y-6">
                <div className="border border-slate-50 dark:border-slate-800/60 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Kelas Saat Ini</span>
                    <span className="text-center">Alur Kenaikan</span>
                    <span>Tujuan Kelas Baru</span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {uniqueClasses.map(cls => (
                      <div key={cls} className="grid grid-cols-3 items-center px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {cls}
                          </span>
                          <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold">
                            {siswaList.filter(s => s.kelas === cls).length} siswa
                          </span>
                        </div>

                        <div className="flex justify-center text-slate-300 dark:text-slate-600">
                          <ChevronRight size={16} />
                        </div>

                        <div>
                          <input
                            type="text"
                            required
                            value={classMappings[cls] || ''}
                            onChange={(e) => handleMappingChange(cls, e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg text-slate-800 dark:text-slate-200 font-bold"
                            placeholder="Contoh: VIII-A atau LULUS"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={16} />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Peringatan Penting Sebelum Memulai!
                    </h4>
                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                      Proses ini akan mengubah atribut kelas dari siswa-siswa di atas secara permanen. 
                      Seluruh saldo tabungan dan riwayat transaksi mereka <strong>tidak akan terpengaruh atau hilang</strong>. 
                      Siswa yang dipetakan ke kelas bernilai <strong>"LULUS"</strong> atau <strong>"ALUMNI"</strong> akan tetap berada di database namun diarsipkan secara visual dari daftar transaksi harian agar tidak memenuhi daftar.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSyncing}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/10 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  <span>Mulai Proses Kenaikan Kelas</span>
                </button>
              </form>
            )}

          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {isConfirming && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-2xl space-y-6">
            
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={24} className="stroke-[2.5px]" />
              <h3 className="font-extrabold text-base text-slate-950 dark:text-slate-50">
                Konfirmasi Kenaikan Kelas
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Anda akan memperbarui kelas untuk total <strong>{activeStudents} siswa aktif</strong> berdasarkan pemetaan berikut:
            </p>

            <div className="max-h-40 overflow-y-auto border border-slate-50 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              {Object.entries(classMappings).map(([from, to]) => (
                <div key={from} className="flex justify-between items-center px-4 py-2 text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{from}</span>
                  <span className="text-slate-400">naik ke</span>
                  <span className={`font-black ${String(to).toUpperCase() === 'LULUS' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {String(to)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsConfirming(false)}
                className="flex-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmPromote}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check size={14} className="stroke-[2.5px]" />
                <span>Ya, Proses Sekarang</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
