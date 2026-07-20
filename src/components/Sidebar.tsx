import { 
  LayoutDashboard, 
  Users, 
  ReceiptText, 
  FileText, 
  Sun, 
  Moon, 
  LogOut, 
  Landmark,
  UserCheck,
  Settings
} from 'lucide-react';
import { User } from 'firebase/auth';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  user: User | null;
  onLogout: () => void;
  schoolName: string;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  darkMode,
  onToggleDarkMode,
  user,
  onLogout,
  schoolName
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Ikhtisar', icon: LayoutDashboard },
    { id: 'siswa', label: 'Data Siswa', icon: Users },
    { id: 'transaksi', label: 'Riwayat Transaksi', icon: ReceiptText },
    { id: 'laporan', label: 'Laporan Rekap', icon: FileText },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col h-screen sticky top-0">
      
      {/* Brand logo */}
      <div className="p-6 border-b border-slate-50 dark:border-slate-800/80 flex items-center gap-3">
        <div className="p-2 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-xl text-white shadow-md shadow-indigo-500/10 shrink-0">
          <Landmark size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-extrabold text-xs tracking-tight text-slate-900 dark:text-slate-50 truncate" title={schoolName}>
            {schoolName}
          </h1>
          <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">
            Tabungan Siswa
          </p>
        </div>
      </div>


      {/* Navigation menu list */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer with Dark mode and Logout */}
      <div className="p-4 border-t border-slate-50 dark:border-slate-800/80 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
        
        {/* User Info */}
        {user && (
          <div className="flex items-center gap-3 px-2 py-1.5">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'Guru'} 
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <UserCheck size={14} />
              </div>
            )}
            <div className="truncate flex-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {user.displayName || 'Bapak/Ibu Guru'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}

        {/* System controls */}
        <div className="flex items-center gap-2">
          {/* Dark Mode toggle */}
          <button
            onClick={onToggleDarkMode}
            title={darkMode ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 transition-all cursor-pointer"
          >
            {darkMode ? (
              <>
                <Sun size={14} className="text-amber-500" />
                <span>Terang</span>
              </>
            ) : (
              <>
                <Moon size={14} className="text-slate-500" />
                <span>Gelap</span>
              </>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            title="Keluar"
            className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </div>

      </div>

    </aside>
  );
}
