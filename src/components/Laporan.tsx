import { useState } from 'react';
import { 
  FileText, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp, 
  Calendar, 
  Download, 
  Table, 
  FileSpreadsheet,
  ReceiptText
} from 'lucide-react';
import { Siswa, Transaksi, ReportType } from '../types';
import { formatRupiah, formatIndonesianDate, isDateInPeriod } from '../utils/helpers';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LaporanProps {
  siswaList: Siswa[];
  transaksiList: Transaksi[];
  schoolName: string;
}

export default function Laporan({
  siswaList,
  transaksiList,
  schoolName
}: LaporanProps) {
  const [period, setPeriod] = useState<ReportType>('daily');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. Enrich transactions with student info for report
  const enrichedTransactions = transaksiList.map(t => {
    const siswa = siswaList.find(s => s.id === t.siswaId);
    return {
      ...t,
      siswaNama: siswa ? siswa.nama : 'Siswa Tidak Diketahui',
      siswaNisn: siswa ? siswa.nisn : '-',
      siswaKelas: siswa ? siswa.kelas : '-',
    };
  });

  // 2. Filter transactions belonging to the selected period
  const reportTransactions = enrichedTransactions
    .filter(t => isDateInPeriod(t.tanggal, period, targetDate))
    .sort((a, b) => new Date(a.tanggalDibuat).getTime() - new Date(b.tanggalDibuat).getTime());

  // 3. Compute stats for report
  const totalMasuk = reportTransactions
    .filter(t => t.tipe === 'MASUK')
    .reduce((sum, t) => sum + t.jumlah, 0);

  const totalKeluar = reportTransactions
    .filter(t => t.tipe === 'KELUAR')
    .reduce((sum, t) => sum + t.jumlah, 0);

  const netSaldo = totalMasuk - totalKeluar;

  // 4. Excel Export
  const handleExportExcel = () => {
    if (reportTransactions.length === 0) {
      alert('Tidak ada data laporan untuk diekspor.');
      return;
    }

    const rows = reportTransactions.map((t, idx) => ({
      'No': idx + 1,
      'Tanggal': t.tanggal,
      'Nama Siswa': t.siswaNama,
      'NISN': t.siswaNisn,
      'Kelas': t.siswaKelas,
      'Keterangan': t.keterangan,
      'Tipe Transaksi': t.tipe === 'MASUK' ? 'UANG MASUK (SETOR)' : 'UANG KELUAR (TARIK)',
      'Jumlah (Rupiah)': t.jumlah
    }));

    // Add recap rows
    const summaryRows = [
      {}, // Empty row
      { 'No': 'REKAPITULASI PERIODE' },
      { 'No': 'Total Setoran (Uang Masuk)', 'Jumlah (Rupiah)': totalMasuk },
      { 'No': 'Total Penarikan (Uang Keluar)', 'Jumlah (Rupiah)': totalKeluar },
      { 'No': 'Saldo Bersih Periode', 'Jumlah (Rupiah)': netSaldo }
    ];

    const finalData = [...rows, ...summaryRows];

    const worksheet = XLSX.utils.json_to_sheet(finalData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Tabungan');

    // Generate filename based on period
    const formattedDate = targetDate.replace(/-/g, '_');
    const filename = `Laporan_Tabungan_${period}_${formattedDate}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // 5. PDF Export
  const handleExportPDF = () => {
    if (reportTransactions.length === 0) {
      alert('Tidak ada data laporan untuk diekspor.');
      return;
    }

    const doc = new jsPDF();
    const formattedDate = formatIndonesianDate(targetDate);
    const periodLabel = period === 'daily' ? 'Harian' : period === 'weekly' ? 'Mingguan (7 Hari)' : 'Bulanan';

    // School Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(schoolName.toUpperCase(), 14, 18);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Sistem Informasi Administrasi Tabungan Siswa', 14, 23);
    doc.line(14, 25, 196, 25); // horizontal line

    // Laporan Details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`LAPORAN KEUANGAN TABUNGAN - ${periodLabel.toUpperCase()}`, 14, 34);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Tanggal Acuan: ${formattedDate}`, 14, 40);

    // Summary Box
    doc.setFillColor(245, 247, 250); // soft gray
    doc.rect(14, 45, 182, 24, 'F');
    
    doc.setFont('Helvetica', 'bold');
    doc.text(`Total Uang Masuk (Setor):`, 18, 51);
    doc.text(formatRupiah(totalMasuk), 85, 51);
    
    doc.text(`Total Uang Keluar (Tarik):`, 18, 57);
    doc.text(formatRupiah(totalKeluar), 85, 57);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFillColor(236, 253, 245); // light green bg for net
    doc.rect(14, 63, 182, 6, 'F');
    doc.text(`Total Tabungan Bersih Periode:`, 18, 67);
    doc.text(formatRupiah(netSaldo), 85, 67);

    // Ledger table
    const tableColumn = ["No", "Tanggal", "Nama Siswa", "Kelas", "Keterangan", "Tipe", "Jumlah"];
    const tableRows = reportTransactions.map((t, idx) => [
      idx + 1,
      t.tanggal,
      t.siswaNama,
      t.siswaKelas,
      t.keterangan,
      t.tipe === 'MASUK' ? 'SETOR' : 'TARIK',
      formatRupiah(t.jumlah)
    ]);

    autoTable(doc, {
      startY: 75,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }, // indigo
      columnStyles: {
        6: { halign: 'right', fontStyle: 'bold' } // align amount to right
      }
    });

    const fileDate = targetDate.replace(/-/g, '_');
    doc.save(`Laporan_Tabungan_${period}_${fileDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Laporan Rekapitulasi Tabungan
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Saring dan unduh laporan transaksi berdasarkan periode harian, mingguan, maupun bulanan.
        </p>
      </div>

      {/* Filter and Period Selection */}
      <div className="bg-white dark:bg-slate-900 p-5 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          
          {/* Period Selector Tabs */}
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Pilih Rentang Periode Laporan
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl">
              <button
                onClick={() => setPeriod('daily')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  period === 'daily'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Harian
              </button>
              <button
                onClick={() => setPeriod('weekly')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  period === 'weekly'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Mingguan
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  period === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Bulanan
              </button>
            </div>
          </div>

          {/* Date Picker */}
          <div className="md:w-64">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              {period === 'daily' ? 'Tanggal Laporan' : period === 'weekly' ? 'Tanggal Acuan (7 Hari Mundur)' : 'Bulan Laporan'}
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2">
              <Calendar size={14} className="text-slate-400" />
              <input
                type={period === 'monthly' ? 'month' : 'date'}
                value={period === 'monthly' && targetDate.length > 7 ? targetDate.substring(0, 7) : targetDate}
                onChange={(e) => {
                  let val = e.target.value;
                  if (period === 'monthly' && val.length === 7) {
                    val = `${val}-01`; // convert YYYY-MM to full date
                  }
                  setTargetDate(val);
                }}
                className="w-full text-xs bg-transparent outline-none border-none text-slate-700 dark:text-slate-300 font-semibold cursor-pointer dark:[color-scheme:dark] dark:text-slate-200"
              />
            </div>
          </div>

        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-50 dark:border-slate-800/80">
          <span className="text-xs text-slate-400 mr-auto">
            Terbaca <strong className="text-slate-700 dark:text-slate-200">{reportTransactions.length} transaksi</strong> pada periode ini.
          </span>
          
          <button
            onClick={handleExportExcel}
            disabled={reportTransactions.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md shadow-emerald-600/10 transition-all cursor-pointer"
          >
            <FileSpreadsheet size={15} />
            <span>Ekspor ke Excel</span>
          </button>
          
          <button
            onClick={handleExportPDF}
            disabled={reportTransactions.length === 0}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md shadow-rose-600/10 transition-all cursor-pointer"
          >
            <FileText size={15} />
            <span>Ekspor ke PDF</span>
          </button>
        </div>
      </div>

      {/* Recap Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <ArrowDownLeft size={20} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Setoran</p>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5">{formatRupiah(totalMasuk)}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl">
            <ArrowUpRight size={20} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Penarikan</p>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5">{formatRupiah(totalKeluar)}</h4>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-indigo-100 uppercase tracking-wider">Net Tabungan Bersih</p>
            <h4 className="text-base font-bold font-mono mt-0.5">{formatRupiah(netSaldo)}</h4>
          </div>
        </div>
      </div>

      {/* Report Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Detail Transaksi Periode Laporan
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3.5">No</th>
                <th className="px-5 py-3.5">Tanggal</th>
                <th className="px-5 py-3.5">Nama Siswa</th>
                <th className="px-5 py-3.5">Kelas</th>
                <th className="px-5 py-3.5">Keterangan</th>
                <th className="px-5 py-3.5">Tipe</th>
                <th className="px-5 py-3.5 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
              {reportTransactions.length > 0 ? (
                reportTransactions.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {t.tanggal}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                      {t.siswaNama}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-medium">
                      {t.siswaKelas}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                      {t.keterangan}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.tipe === 'MASUK'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                      }`}>
                        {t.tipe === 'MASUK' ? 'SETOR' : 'TARIK'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold font-mono text-xs text-slate-900 dark:text-slate-100">
                      {formatRupiah(t.jumlah)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ReceiptText size={32} className="text-slate-300" />
                      <span>Tidak ada transaksi tercatat untuk periode ini.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
