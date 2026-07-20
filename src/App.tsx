import { useState, useEffect } from 'react';
import { 
  Landmark, 
  LogOut, 
  UserCheck, 
  AlertCircle, 
  RefreshCw,
  LogIn,
  ShieldCheck,
  CloudLightning,
  Sun,
  Moon
} from 'lucide-react';
import { User } from 'firebase/auth';

// Import Types
import { Siswa, Transaksi } from './types';

// Import Libs
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken,
  setAccessToken
} from './lib/firebase';
import { 
  getLocalSiswa, 
  getLocalTransaksi, 
  saveLocalSiswa,
  saveLocalTransaksi,
  getSyncQueue,
  saveSyncQueue,
  addSiswaLocal, 
  addTransaksiLocal, 
  syncWithSheets,
  getSavedSpreadsheetId,
  saveSpreadsheetId,
  updateSiswaBulkLocal,
  updateTransaksiBulkLocal
} from './lib/syncEngine';

import { 
  testConnection,
  saveSiswaToFirestore,
  saveSiswaBulkToFirestore,
  deleteSiswaFromFirestore,
  getSiswaFromFirestore,
  saveTransaksiToFirestore,
  saveTransaksiBulkToFirestore,
  deleteTransaksiFromFirestore,
  getTransaksiFromFirestore,
  saveSettingsToFirestore,
  getSettingsFromFirestore
} from './lib/firestore';

// Import Components
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import OfflineStatus from './components/OfflineStatus';
import Dashboard from './components/Dashboard';
import SiswaList from './components/SiswaList';
import TransaksiList from './components/TransaksiList';
import Laporan from './components/Laporan';
import Pengaturan from './components/Pengaturan';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('tabungan_dark_mode');
    return saved === 'true';
  });

  const [schoolName, setSchoolName] = useState<string>(() => {
    return localStorage.getItem('tabungan_school_name') || 'SMP Negeri Indonesia';
  });


  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(getSavedSpreadsheetId());

  // App Data State (initially loaded from localStorage cache)
  const [siswa, setSiswa] = useState<Siswa[]>(() => getLocalSiswa());
  const [transaksi, setTransaksi] = useState<Transaksi[]>(() => getLocalTransaksi());

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Transaction Form State (Inline, outside popup)
  const [showTransaksiForm, setShowTransaksiForm] = useState(false);
  const [transaksiFormType, setTransaksiFormType] = useState<'MASUK' | 'KELUAR'>('MASUK');

  // Confirmation Modal States
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [txToDelete, setTxToDelete] = useState<string | null>(null);

  // Apply dark mode theme class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tabungan_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tabungan_dark_mode', 'false');
    }
  }, [darkMode]);

  // Handle Online/Offline Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Test Connection to Firestore on Boot
  useEffect(() => {
    testConnection();
  }, []);

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, token) => {
        setUser(firebaseUser);
        setNeedsAuth(false);

        // Preload user data from Firestore for immediate access and sync
        try {
          const fsSiswa = await getSiswaFromFirestore(firebaseUser.uid);
          const fsTransaksi = await getTransaksiFromFirestore(firebaseUser.uid);
          const fsSettings = await getSettingsFromFirestore(firebaseUser.uid);

          if (fsSiswa && fsSiswa.length > 0) {
            setSiswa(fsSiswa);
            saveLocalSiswa(fsSiswa);
          }
          if (fsTransaksi && fsTransaksi.length > 0) {
            setTransaksi(fsTransaksi);
            saveLocalTransaksi(fsTransaksi);
          }
          if (fsSettings) {
            if (fsSettings.schoolName) {
              setSchoolName(fsSettings.schoolName);
              localStorage.setItem('tabungan_school_name', fsSettings.schoolName);
            }
            if (fsSettings.spreadsheetId) {
              setSpreadsheetId(fsSettings.spreadsheetId);
              saveSpreadsheetId(fsSettings.spreadsheetId);
            }
          }
        } catch (e) {
          console.warn('Failed to load initial Firestore data, will sync via sheets:', e);
        }

        // Sync with sheets using newly cached token
        triggerSync(token);
      },
      () => {
        // Auth failed or no saved token
        setUser(null);
        setNeedsAuth(true);
      }
    );

    return () => unsubscribe();
  }, []);

  // Sync with sheets
  const triggerSync = async (tokenOverride?: string) => {
    const token = tokenOverride || getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    if (!navigator.onLine) {
      return; // Can't sync while offline
    }

    setIsSyncing(true);
    try {
      const { siswa: latestSiswa, transaksi: latestTransaksi } = await syncWithSheets(
        token,
        (msg) => setSyncMessage(msg)
      );
      setSiswa(latestSiswa);
      setTransaksi(latestTransaksi);
      const savedId = getSavedSpreadsheetId();
      setSpreadsheetId(savedId);

      // Save latest synchronized data to Firestore
      if (user) {
        setSyncMessage('Menyimpan data terbaru ke Cloud Firestore...');
        await saveSiswaBulkToFirestore(user.uid, latestSiswa);
        await saveTransaksiBulkToFirestore(user.uid, latestTransaksi);
        if (schoolName || savedId) {
          await saveSettingsToFirestore(user.uid, schoolName, savedId || '');
        }
      }
    } catch (err) {
      console.error('Failed to sync:', err);
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  // Google Login trigger
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        triggerSync(result.accessToken);
      }
    } catch (err: any) {
      console.error('Google sign in failed:', err);
      const errorCode = err?.code || '';
      const errorMessage = err?.message || '';

      if (errorCode === 'auth/popup-closed-by-user') {
        setLoginError(
          'Jendela login ditutup sebelum selesai. Silakan coba klik tombol login lagi dan tunggu hingga proses autentikasi selesai sepenuhnya.'
        );
      } else if (errorCode === 'auth/popup-blocked') {
        setLoginError(
          'Jendela login diblokir oleh browser Anda. Silakan aktifkan / izinkan pop-up untuk situs ini di pengaturan browser Anda.'
        );
      } else if (errorMessage.includes('cross-origin') || errorMessage.includes('iframe') || errorCode === 'auth/internal-error') {
        setLoginError(
          'Terjadi kendala keamanan cross-origin (iframe). Silakan buka aplikasi ini di tab baru menggunakan tombol "Buka di tab baru / Open in new tab" di pojok kanan atas preview.'
        );
      } else {
        setLoginError(
          'Gagal masuk dengan Google. Pastikan Anda mengizinkan pop-up dan cookies pihak ketiga, atau buka aplikasi ini di tab baru.'
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout triggers
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    
    // Clear all react states
    setUser(null);
    setNeedsAuth(true);
    setSiswa([]);
    setTransaksi([]);
    setSpreadsheetId(null);
    
    // Securely wipe all locally stored data and cached credentials
    localStorage.removeItem('tabungan_spreadsheet_id');
    localStorage.removeItem('tabungan_siswa_data');
    localStorage.removeItem('tabungan_transaksi_data');
    localStorage.removeItem('tabungan_sync_queue');
  };

  // Add Siswa
  const handleAddSiswa = (siswaData: { nisn: string; nama: string; kelas: string }) => {
    const newSiswa: Siswa = {
      id: crypto.randomUUID(),
      nisn: siswaData.nisn,
      nama: siswaData.nama,
      kelas: siswaData.kelas,
      tanggalDibuat: new Date().toISOString().split('T')[0],
    };

    addSiswaLocal(newSiswa);
    // Reload local list immediately for instant UI response
    setSiswa(getLocalSiswa());

    // Save to Firestore
    if (user) {
      saveSiswaToFirestore(user.uid, newSiswa).catch(console.error);
    }

    // Trigger async push if online
    const token = getAccessToken();
    if (token && isOnline) {
      triggerSync(token);
    }
  };

  // Add Transaksi
  const handleAddTransaksi = (transaksiData: {
    siswaId: string;
    tipe: 'MASUK' | 'KELUAR';
    jumlah: number;
    keterangan: string;
    tanggal: string;
  }) => {
    const newTransaksi: Transaksi = {
      id: crypto.randomUUID(),
      siswaId: transaksiData.siswaId,
      tipe: transaksiData.tipe,
      jumlah: transaksiData.jumlah,
      keterangan: transaksiData.keterangan,
      tanggal: transaksiData.tanggal,
      tanggalDibuat: new Date().toISOString(),
    };

    addTransaksiLocal(newTransaksi);
    // Reload local list immediately for instant UI response
    setTransaksi(getLocalTransaksi());

    // Save to Firestore
    if (user) {
      saveTransaksiToFirestore(user.uid, newTransaksi).catch(console.error);
    }

    // Trigger async push if online
    const token = getAccessToken();
    if (token && isOnline) {
      triggerSync(token);
    }
  };

  // Add Multiple Transaksi (Bulk)
  const handleAddTransaksiBulk = (transaksiListInput: {
    siswaId: string;
    tipe: 'MASUK' | 'KELUAR';
    jumlah: number;
    keterangan: string;
    tanggal: string;
  }[]) => {
    if (transaksiListInput.length === 0) return;
    
    const newTransactions: Transaksi[] = transaksiListInput.map(t => ({
      id: crypto.randomUUID(),
      siswaId: t.siswaId,
      tipe: t.tipe,
      jumlah: t.jumlah,
      keterangan: t.keterangan,
      tanggal: t.tanggal,
      tanggalDibuat: new Date().toISOString(),
    }));

    // Save multiple items to local storage and queue them!
    const currentTx = getLocalTransaksi();
    saveLocalTransaksi([...currentTx, ...newTransactions]);

    const queue = getSyncQueue();
    const newQueueItems = newTransactions.map(t => ({
      id: crypto.randomUUID(),
      action: 'CREATE_TRANSAKSI' as const,
      data: t,
      timestamp: Date.now(),
    }));
    saveSyncQueue([...queue, ...newQueueItems]);

    // Reload local list immediately for instant UI response
    setTransaksi(getLocalTransaksi());

    // Save to Firestore
    if (user) {
      saveTransaksiBulkToFirestore(user.uid, newTransactions).catch(console.error);
    }

    // Trigger async push if online
    const token = getAccessToken();
    if (token && isOnline) {
      triggerSync(token);
    }
  };

  // Open Quick Transaction Input Inline Form
  const openInputModal = (type: 'MASUK' | 'KELUAR') => {
    setActiveTab('transaksi');
    setTransaksiFormType(type);
    setShowTransaksiForm(true);
  };

  // Handle school name update
  const handleUpdateSchoolName = (name: string) => {
    setSchoolName(name);
    localStorage.setItem('tabungan_school_name', name);
    if (user) {
      saveSettingsToFirestore(user.uid, name, spreadsheetId || '').catch(console.error);
    }
  };

  // Handle mass promotion of students to the next grade
  const handlePromoteSiswa = (mappings: Record<string, string>) => {
    const updatedSiswa = siswa.map(s => {
      const currentClass = s.kelas.trim();
      const nextClass = mappings[currentClass] || currentClass;
      return {
        ...s,
        kelas: nextClass,
      };
    });

    updateSiswaBulkLocal(updatedSiswa);
    setSiswa(updatedSiswa);

    // Save to Firestore
    if (user) {
      saveSiswaBulkToFirestore(user.uid, updatedSiswa).catch(console.error);
    }

    // Trigger async push if online
    const token = getAccessToken();
    if (token && isOnline) {
      triggerSync(token);
    }
  };

  // Handle edit siswa profile
  const handleEditSiswa = (id: string, updatedData: { nisn: string; nama: string; kelas: string }) => {
    const updatedSiswa = siswa.map(s => {
      if (s.id === id) {
        return {
          ...s,
          ...updatedData
        };
      }
      return s;
    });

    updateSiswaBulkLocal(updatedSiswa);
    setSiswa(updatedSiswa);

    // Save to Firestore
    if (user) {
      const edited = updatedSiswa.find(s => s.id === id);
      if (edited) {
        saveSiswaToFirestore(user.uid, edited).catch(console.error);
      }
    }

    // Trigger async push if online
    const token = getAccessToken();
    if (token && isOnline) {
      triggerSync(token);
    }
  };

  // Handle delete siswa profile and cascading transactions
  const handleDeleteSiswa = (id: string) => {
    const updatedSiswa = siswa.filter(s => s.id !== id);
    const updatedTransaksi = transaksi.filter(t => t.siswaId !== id);

    updateSiswaBulkLocal(updatedSiswa);
    updateTransaksiBulkLocal(updatedTransaksi);
    
    setSiswa(updatedSiswa);
    setTransaksi(updatedTransaksi);

    // Save to Firestore & handle cascade
    if (user) {
      deleteSiswaFromFirestore(user.uid, id).catch(console.error);
      const deletedTxs = transaksi.filter(t => t.siswaId === id);
      deletedTxs.forEach(t => {
        deleteTransaksiFromFirestore(user.uid, t.id).catch(console.error);
      });
    }

    // Trigger async push if online
    const token = getAccessToken();
    if (token && isOnline) {
      triggerSync(token);
    }
  };

  // Handle delete individual transaction
  const handleDeleteTransaksiClick = (id: string) => {
    setTxToDelete(id);
  };

  const handleConfirmDeleteTransaksi = () => {
    if (txToDelete) {
      const updatedTransaksi = transaksi.filter(t => t.id !== txToDelete);
      updateTransaksiBulkLocal(updatedTransaksi);
      setTransaksi(updatedTransaksi);

      // Save to Firestore
      if (user) {
        deleteTransaksiFromFirestore(user.uid, txToDelete).catch(console.error);
      }

      // Trigger async push if online
      const token = getAccessToken();
      if (token && isOnline) {
        triggerSync(token);
      }
      setTxToDelete(null);
    }
  };


  // 1. Calculate balances dynamically for students
  const siswaWithBalances = siswa.map(s => {
    const studentTransactions = transaksi.filter(t => t.siswaId === s.id);
    const totalMasuk = studentTransactions.filter(t => t.tipe === 'MASUK').reduce((sum, t) => sum + t.jumlah, 0);
    const totalKeluar = studentTransactions.filter(t => t.tipe === 'KELUAR').reduce((sum, t) => sum + t.jumlah, 0);
    return {
      ...s,
      saldo: totalMasuk - totalKeluar
    };
  });

  // Dark mode inline class mapper
  const bgClass = darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';

  // LOGIN SCREEN
  if (needsAuth) {
    return (
      <div className={`${bgClass} min-h-screen flex items-center justify-center p-4 transition-colors duration-200`}>
        {/* Toggle dark mode on login screen */}
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="absolute top-6 right-6 p-3 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
        >
          {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
        </button>

        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/80 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-200 text-center">
          
          {/* Logo and Brand */}
          <div className="space-y-3">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-600/20">
              <Landmark size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50">
                Tabungan Siswa
              </h2>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-widest uppercase mt-0.5">
                {schoolName}
              </p>
            </div>
          </div>

          {/* Intro Information */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-left text-xs text-slate-500 dark:text-slate-400 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" size={16} />
              <p>
                <strong>Sistem Login Guru:</strong> Akses penuh pencatatan tabungan, rekap laporan, dan export data hanya untuk staf pengajar.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <CloudLightning className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={16} />
              <p>
                <strong>Database Google Sheets:</strong> Seluruh data disimpan real-time ke akun spreadsheet pribadi guru dengan akses offline penuh.
              </p>
            </div>
          </div>

          {/* Error Notice */}
          {loginError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-left text-xs text-rose-600 dark:text-rose-400 flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-500 dark:text-rose-400" />
              <div className="space-y-1">
                <p className="font-bold">Gagal Menghubungkan Akun</p>
                <p className="leading-relaxed text-[11px]">{loginError}</p>
              </div>
            </div>
          )}

          {/* Sign In Button */}
          <div className="space-y-4">
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Menghubungkan...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Masuk Dengan Google</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-400">
              Dengan masuk, aplikasi akan meminta izin akses Google Sheets dan Google Drive untuk menulis database keuangan siswa.
            </p>
          </div>

        </div>
      </div>
    );
  }

  // APP SHELL (AUTHENTICATED)
  return (
    <div className={`${bgClass} min-h-screen flex flex-col md:flex-row transition-colors duration-200 w-full overflow-x-hidden`}>
      
      {/* 1. Desktop Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          user={user}
          onLogout={handleLogoutClick}
          schoolName={schoolName}
        />
      </div>

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0 w-full max-w-full overflow-x-hidden">
        
        {/* Offline & Sync Status bar */}
        <OfflineStatus
          onSyncTrigger={() => triggerSync()}
          isSyncing={isSyncing}
          syncMessage={syncMessage}
        />

        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 px-3 py-2 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-3">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg shrink-0">
              <Landmark size={14} />
            </div>
            <h1 className="font-extrabold text-xs text-slate-900 dark:text-slate-50 tracking-tight truncate" title={schoolName}>
              {schoolName}
            </h1>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Dark Mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-950 dark:hover:text-slate-100 transition-all cursor-pointer"
              title={darkMode ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
            >
              {darkMode ? <Sun size={13} className="text-amber-500" /> : <Moon size={13} />}
            </button>

            <button 
              onClick={handleLogoutClick}
              className="text-[9px] font-bold text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-950 px-2 py-1 rounded-lg active:bg-rose-50 dark:active:bg-rose-950/20 transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Primary Page Canvas */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto animate-in fade-in duration-200">
          
          {/* Active Tab Router */}
          {activeTab === 'dashboard' && (
            <Dashboard
              siswaList={siswaWithBalances}
              transaksiList={transaksi}
              onOpenInputModal={openInputModal}
              onNavigateToTab={setActiveTab}
            />
          )}

          {activeTab === 'siswa' && (
            <SiswaList
              siswaList={siswaWithBalances}
              transaksiList={transaksi}
              onAddSiswa={handleAddSiswa}
              onEditSiswa={handleEditSiswa}
              onDeleteSiswa={handleDeleteSiswa}
            />
          )}

          {activeTab === 'transaksi' && (
            <TransaksiList
              siswaList={siswaWithBalances}
              transaksiList={transaksi}
              onAddTransaksi={handleAddTransaksi}
              onAddTransaksiBulk={handleAddTransaksiBulk}
              onDeleteTransaksi={handleDeleteTransaksiClick}
              showForm={showTransaksiForm}
              onToggleForm={setShowTransaksiForm}
              formType={transaksiFormType}
              onChangeFormType={setTransaksiFormType}
            />
          )}

          {activeTab === 'laporan' && (
            <Laporan
              siswaList={siswaWithBalances}
              transaksiList={transaksi}
              schoolName={schoolName}
            />
          )}

          {activeTab === 'pengaturan' && (
            <Pengaturan
              schoolName={schoolName}
              onUpdateSchoolName={handleUpdateSchoolName}
              siswaList={siswaWithBalances}
              onPromoteSiswa={handlePromoteSiswa}
              isSyncing={isSyncing}
            />
          )}

        </main>

      </div>

      {/* 3. Mobile Bottom Nav bar (Sticky bottom) */}
      <div className="block md:hidden">
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Modern styled confirmation modals */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
                <LogOut size={20} className="stroke-[2.5px]" />
              </div>
              <h3 className="font-extrabold text-base text-slate-950 dark:text-slate-50">
                Konfirmasi Keluar
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin keluar dari akun? Data tabungan di Google Sheets tetap aman. Anda dapat masuk kembali kapan saja.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmLogout}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2.5 text-xs font-bold transition-colors cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {txToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
                <AlertCircle size={20} className="stroke-[2.5px]" />
              </div>
              <h3 className="font-extrabold text-base text-slate-950 dark:text-slate-50">
                Hapus Transaksi?
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus transaksi ini? Saldo siswa akan otomatis disesuaikan kembali secara real-time.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setTxToDelete(null)}
                className="flex-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteTransaksi}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2.5 text-xs font-bold transition-colors cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
