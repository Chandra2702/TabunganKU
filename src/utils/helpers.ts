/**
 * Format number to Indonesian Rupiah currency string
 */
export const formatRupiah = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Format standard ISO date string (YYYY-MM-DD) to friendly Indonesian date format
 */
export const formatIndonesianDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = months[parseInt(parts[1], 10) - 1] || '';
    const day = parseInt(parts[2], 10);
    return `${day} ${month} ${year}`;
  }
  
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Calculate dates for harian (daily), mingguan (weekly), bulanan (monthly)
 */
export const isDateInPeriod = (dateStr: string, period: 'daily' | 'weekly' | 'monthly', targetDate: string = new Date().toISOString().split('T')[0]): boolean => {
  if (!dateStr) return false;
  
  const d = new Date(dateStr);
  const t = new Date(targetDate);
  
  // Set time to midnight for accurate day calculations
  d.setHours(0,0,0,0);
  t.setHours(0,0,0,0);
  
  if (period === 'daily') {
    return d.getTime() === t.getTime();
  }
  
  if (period === 'weekly') {
    // Current week is defined as last 7 days from target date
    const oneWeekAgo = new Date(t);
    oneWeekAgo.setDate(t.getDate() - 7);
    return d.getTime() >= oneWeekAgo.getTime() && d.getTime() <= t.getTime();
  }
  
  if (period === 'monthly') {
    // Same month and same year
    return d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  }
  
  return false;
};

/**
 * Auto suggest next grade / class based on current class string
 */
export const getSuggestedNextClass = (currentClass: string): string => {
  const trimmed = currentClass.trim();
  
  // Roman Numerals Matchers
  // VII -> VIII
  if (/^vii\b/i.test(trimmed)) {
    return trimmed.replace(/^vii/i, 'VIII');
  }
  // VIII -> IX
  if (/^viii\b/i.test(trimmed)) {
    return trimmed.replace(/^viii/i, 'IX');
  }
  // IX -> LULUS
  if (/^ix\b/i.test(trimmed)) {
    return 'LULUS';
  }
  // X -> XI, XI -> XII, etc., just in case
  if (/^x\b/i.test(trimmed)) {
    return trimmed.replace(/^x/i, 'XI');
  }
  if (/^xi\b/i.test(trimmed)) {
    return trimmed.replace(/^xi/i, 'XII');
  }
  if (/^xii\b/i.test(trimmed)) {
    return 'LULUS';
  }

  // Digits Matchers
  // 7 -> 8
  if (/^7\b/.test(trimmed)) {
    return trimmed.replace(/^7/, '8');
  }
  // 8 -> 9
  if (/^8\b/.test(trimmed)) {
    return trimmed.replace(/^8/, '9');
  }
  // 9 -> LULUS
  if (/^9\b/.test(trimmed)) {
    return 'LULUS';
  }
  // 10 -> 11, etc.
  if (/^10\b/.test(trimmed)) {
    return trimmed.replace(/^10/, '11');
  }
  if (/^11\b/.test(trimmed)) {
    return trimmed.replace(/^11/, '12');
  }
  if (/^12\b/.test(trimmed)) {
    return 'LULUS';
  }

  // Fallback: If "lulus" or "alumni", keep it
  if (/^lulus|^alumni/i.test(trimmed)) {
    return 'LULUS';
  }

  return trimmed; // default fallback is to keep it the same, user can edit it
};

