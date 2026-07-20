import { 
  LayoutDashboard, 
  Users, 
  ReceiptText, 
  FileText, 
  Settings
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({
  activeTab,
  onTabChange
}: BottomNavProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Ikhtisar', icon: LayoutDashboard },
    { id: 'siswa', label: 'Siswa', icon: Users },
    { id: 'transaksi', label: 'Transaksi', icon: ReceiptText },
    { id: 'laporan', label: 'Laporan', icon: FileText },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 px-2 py-1 flex items-center justify-around gap-0.5 pb-safe shadow-md">
      {menuItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg transition-all cursor-pointer flex-1 ${
              isActive 
                ? 'bg-indigo-50/85 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold scale-[1.02] shadow-sm shadow-indigo-100/5' 
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Icon size={16} />
            <span className="text-[8.5px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

