import { Siswa, Transaksi } from '../types';

const SPREADSHEET_NAME = 'Aplikasi Tabungan Siswa SMP';

/**
 * Helper to generate safe and sanitized sheet title for students in a class.
 */
function getSiswaSheetTitle(kelas: string): string {
  const safeKelas = (kelas || 'Umum').trim().replace(/[:\?\*\[\]\\\/]/g, '_');
  return `Siswa - ${safeKelas}`;
}

/**
 * Helper to generate safe and sanitized sheet title for transactions in a class.
 */
function getTransaksiSheetTitle(kelas: string): string {
  const safeKelas = (kelas || 'Umum').trim().replace(/[:\?\*\[\]\\\/]/g, '_');
  return `Transaksi - ${safeKelas}`;
}

/**
 * Helper to generate range paths safely, always wrapping sheet names in single quotes to support spaces, hyphens, and special characters.
 */
function getRangePath(sheetTitle: string, range: string): string {
  const escapedTitle = `'${sheetTitle.replace(/'/g, "''")}'`;
  return `${encodeURIComponent(escapedTitle)}!${range}`;
}

/**
 * Get cached students list directly from localStorage to resolve classes without circular imports.
 */
function getSiswaListFromCache(): Siswa[] {
  try {
    const data = localStorage.getItem('tabungan_siswa_data');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Search Google Drive for an existing spreadsheet with the specific name.
 * If not found, create a new one.
 */
export async function findOrCreateSpreadsheet(accessToken: string): Promise<string> {
  // 1. Search for the spreadsheet
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(SPREADSHEET_NAME)}'+and+mimeType='application/vnd.google-apps.spreadsheet'+and+trashed=false&fields=files(id,name)`;
  
  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to search Google Drive: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // 2. Not found, create a new spreadsheet with default initial sheets
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: SPREADSHEET_NAME,
      },
      sheets: [
        { properties: { title: 'Siswa' } },
        { properties: { title: 'Transaksi' } },
      ],
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create spreadsheet: ${createResponse.statusText}`);
  }

  const newSheetData = await createResponse.json();
  const spreadsheetId = newSheetData.spreadsheetId;

  // 3. Write headers for default initial sheets
  await writeHeaders(spreadsheetId, accessToken);

  return spreadsheetId;
}

/**
 * Write headers to standard legacy Siswa and Transaksi sheets
 */
async function writeHeaders(spreadsheetId: string, accessToken: string): Promise<void> {
  const headers = [
    {
      range: 'Siswa!A1:F1',
      values: [['ID', 'NISN', 'Nama', 'Kelas', 'Saldo', 'Tanggal_Dibuat']],
    },
    {
      range: 'Transaksi!A1:G1',
      values: [['ID', 'Siswa_ID', 'Tipe', 'Jumlah', 'Keterangan', 'Tanggal', 'Tanggal_Dibuat']],
    },
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: headers,
    }),
  });

  if (!response.ok) {
    console.error('Failed to write sheet headers:', await response.text());
  }
}

/**
 * Fetch all sheet titles from a spreadsheet.
 */
async function getAllSheetTitles(spreadsheetId: string, accessToken: string): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch spreadsheet metadata: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.sheets) return [];
  return data.sheets.map((s: any) => s.properties.title);
}

/**
 * Helper to ensure a specific sheet exists. If not, it creates it and writes headers.
 */
async function ensureSheetExistsWithHeaders(
  spreadsheetId: string,
  title: string,
  headers: string[],
  existingTitles: string[],
  accessToken: string
): Promise<void> {
  if (existingTitles.includes(title)) {
    return;
  }

  // Create sheet
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create sheet "${title}": ${response.statusText}`);
  }

  // Add to our existingTitles tracking
  existingTitles.push(title);

  // Write headers to the new sheet
  const headersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${getRangePath(title, 'A1')}?valueInputOption=USER_ENTERED`;
  const headersResponse = await fetch(headersUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [headers],
    }),
  });

  if (!headersResponse.ok) {
    console.error(`Failed to write headers for "${title}":`, await headersResponse.text());
  }
}

/**
 * Fetch all students (Siswa) from Google Sheets across all per-class sheets and the legacy sheet.
 */
export async function fetchSiswaFromSheets(spreadsheetId: string, accessToken: string): Promise<Siswa[]> {
  try {
    const titles = await getAllSheetTitles(spreadsheetId, accessToken);
    const siswaSheets = titles.filter(t => t === 'Siswa' || t.startsWith('Siswa - '));
    
    if (siswaSheets.length === 0) return [];

    const allSiswa: Siswa[] = [];
    
    // Fetch in parallel
    const promises = siswaSheets.map(async (sheetTitle) => {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${getRangePath(sheetTitle, 'A2:F')}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (!data.values) return;

      data.values.forEach((row: any[]) => {
        if (!row[0]) return; // Skip empty rows
        
        let saldo = 0;
        let tanggalDibuat = '';
        
        if (row.length >= 6) {
          // New format: ['ID', 'NISN', 'Nama', 'Kelas', 'Saldo', 'Tanggal_Dibuat']
          saldo = row[4] ? Number(row[4]) : 0;
          tanggalDibuat = row[5] || '';
        } else {
          // Old format or 5 columns: ['ID', 'NISN', 'Nama', 'Kelas', 'Tanggal_Dibuat']
          const val4 = row[4] || '';
          if (val4.includes('-') || val4.includes('T') || val4.includes('/') || isNaN(Number(val4))) {
            tanggalDibuat = val4;
            saldo = 0;
          } else {
            saldo = Number(val4);
            tanggalDibuat = '';
          }
        }

        allSiswa.push({
          id: row[0] || '',
          nisn: row[1] || '',
          nama: row[2] || '',
          kelas: row[3] || '',
          saldo,
          tanggalDibuat: tanggalDibuat || new Date().toISOString(),
        });
      });
    });

    await Promise.all(promises);
    
    // De-duplicate by id just in case
    const seen = new Set<string>();
    return allSiswa.filter(s => {
      if (!s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  } catch (error) {
    console.error('fetchSiswaFromSheets failed:', error);
    return [];
  }
}

/**
 * Fetch all transactions (Transaksi) from Google Sheets across all per-class sheets and the legacy sheet.
 */
export async function fetchTransaksiFromSheets(spreadsheetId: string, accessToken: string): Promise<Transaksi[]> {
  try {
    const titles = await getAllSheetTitles(spreadsheetId, accessToken);
    const transaksiSheets = titles.filter(t => t === 'Transaksi' || t.startsWith('Transaksi - '));
    
    if (transaksiSheets.length === 0) return [];

    const allTransaksi: Transaksi[] = [];
    
    // Fetch in parallel
    const promises = transaksiSheets.map(async (sheetTitle) => {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${getRangePath(sheetTitle, 'A2:G')}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (!data.values) return;

      data.values.forEach((row: any[]) => {
        if (!row[0]) return; // Skip empty rows
        allTransaksi.push({
          id: row[0] || '',
          siswaId: row[1] || '',
          tipe: (row[2] || 'MASUK') as 'MASUK' | 'KELUAR',
          jumlah: Number(row[3]) || 0,
          keterangan: row[4] || '',
          tanggal: row[5] || '',
          tanggalDibuat: row[6] || '',
        });
      });
    });

    await Promise.all(promises);
    
    // De-duplicate by id just in case
    const seen = new Set<string>();
    return allTransaksi.filter(t => {
      if (!t.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  } catch (error) {
    console.error('fetchTransaksiFromSheets failed:', error);
    return [];
  }
}

/**
 * Append a list of students to Google Sheets, automatically grouping them by class.
 */
export async function appendSiswaToSheets(spreadsheetId: string, siswaList: Siswa[], accessToken: string): Promise<void> {
  if (siswaList.length === 0) return;

  const titles = await getAllSheetTitles(spreadsheetId, accessToken);
  
  // Group siswa by class
  const groups: { [sheetTitle: string]: Siswa[] } = {};
  for (const s of siswaList) {
    const title = getSiswaSheetTitle(s.kelas);
    if (!groups[title]) {
      groups[title] = [];
    }
    groups[title].push(s);
  }

  // Append for each class group
  for (const [sheetTitle, list] of Object.entries(groups)) {
    await ensureSheetExistsWithHeaders(
      spreadsheetId,
      sheetTitle,
      ['ID', 'NISN', 'Nama', 'Kelas', 'Saldo', 'Tanggal_Dibuat'],
      titles,
      accessToken
    );

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${getRangePath(sheetTitle, 'A2:F')}:append?valueInputOption=USER_ENTERED`;
    const values = list.map(s => [s.id, s.nisn, s.nama, s.kelas, s.saldo ?? 0, s.tanggalDibuat]);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to append Siswa to ${sheetTitle}: ${response.statusText}`);
    }
  }
}

/**
 * Append a list of transactions to Google Sheets, automatically grouping them by the student's class.
 */
export async function appendTransaksiToSheets(
  spreadsheetId: string, 
  transaksiList: Transaksi[], 
  accessToken: string,
  siswaList?: Siswa[]
): Promise<void> {
  if (transaksiList.length === 0) return;

  const finalSiswaList = siswaList || getSiswaListFromCache();
  const siswaMap = new Map<string, Siswa>();
  for (const s of finalSiswaList) {
    siswaMap.set(s.id, s);
  }

  const titles = await getAllSheetTitles(spreadsheetId, accessToken);
  
  // Group transactions by student's class
  const groups: { [sheetTitle: string]: Transaksi[] } = {};
  for (const t of transaksiList) {
    const s = siswaMap.get(t.siswaId);
    const kelas = s ? s.kelas : 'Umum';
    const title = getTransaksiSheetTitle(kelas);
    if (!groups[title]) {
      groups[title] = [];
    }
    groups[title].push(t);
  }

  // Append for each group
  for (const [sheetTitle, list] of Object.entries(groups)) {
    await ensureSheetExistsWithHeaders(
      spreadsheetId,
      sheetTitle,
      ['ID', 'Siswa_ID', 'Tipe', 'Jumlah', 'Keterangan', 'Tanggal', 'Tanggal_Dibuat'],
      titles,
      accessToken
    );

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${getRangePath(sheetTitle, 'A2:G')}:append?valueInputOption=USER_ENTERED`;
    const values = list.map(t => [
      t.id, 
      t.siswaId, 
      t.tipe, 
      t.jumlah, 
      t.keterangan, 
      t.tanggal, 
      t.tanggalDibuat
    ]);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to append Transaksi to ${sheetTitle}: ${response.statusText}`);
    }
  }
}

/**
 * Overwrite the entire Siswa sheets with an updated list of students.
 */
export async function overwriteSiswaOnSheets(
  spreadsheetId: string,
  siswaList: Siswa[],
  accessToken: string
): Promise<void> {
  const titles = await getAllSheetTitles(spreadsheetId, accessToken);
  
  // 1. Clear all existing student sheets below the header (A2:F)
  const studentSheetsToClear = titles.filter(t => t === 'Siswa' || t.startsWith('Siswa - '));
  
  for (const sheetTitle of studentSheetsToClear) {
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${getRangePath(sheetTitle, 'A2:F')}:clear`;
    const clearResponse = await fetch(clearUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!clearResponse.ok) {
      console.warn(`Failed to clear Siswa sheet "${sheetTitle}": ${clearResponse.statusText}`);
    }
  }

  if (siswaList.length === 0) return;

  // 2. Group new students by class
  const groups: { [sheetTitle: string]: Siswa[] } = {};
  for (const s of siswaList) {
    const title = getSiswaSheetTitle(s.kelas);
    if (!groups[title]) {
      groups[title] = [];
    }
    groups[title].push(s);
  }

  // 3. Write each group
  for (const [sheetTitle, list] of Object.entries(groups)) {
    await ensureSheetExistsWithHeaders(
      spreadsheetId,
      sheetTitle,
      ['ID', 'NISN', 'Nama', 'Kelas', 'Saldo', 'Tanggal_Dibuat'],
      titles,
      accessToken
    );

    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${getRangePath(sheetTitle, 'A2:F')}?valueInputOption=USER_ENTERED`;
    const values = list.map(s => [s.id, s.nisn, s.nama, s.kelas, s.saldo ?? 0, s.tanggalDibuat]);

    const writeResponse = await fetch(writeUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    });

    if (!writeResponse.ok) {
      throw new Error(`Failed to overwrite Siswa in ${sheetTitle}: ${writeResponse.statusText}`);
    }
  }
}

/**
 * Overwrite the entire Transaksi sheets with an updated list of transactions.
 */
export async function overwriteTransaksiOnSheets(
  spreadsheetId: string,
  transaksiList: Transaksi[],
  accessToken: string,
  siswaList?: Siswa[]
): Promise<void> {
  const finalSiswaList = siswaList || getSiswaListFromCache();
  const siswaMap = new Map<string, Siswa>();
  for (const s of finalSiswaList) {
    siswaMap.set(s.id, s);
  }

  const titles = await getAllSheetTitles(spreadsheetId, accessToken);
  
  // 1. Clear all existing transaction sheets below the header (A2:G)
  const txSheetsToClear = titles.filter(t => t === 'Transaksi' || t.startsWith('Transaksi - '));
  
  for (const sheetTitle of txSheetsToClear) {
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${getRangePath(sheetTitle, 'A2:G')}:clear`;
    const clearResponse = await fetch(clearUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!clearResponse.ok) {
      console.warn(`Failed to clear Transaksi sheet "${sheetTitle}": ${clearResponse.statusText}`);
    }
  }

  if (transaksiList.length === 0) return;

  // 2. Group new transactions by class
  const groups: { [sheetTitle: string]: Transaksi[] } = {};
  for (const t of transaksiList) {
    const s = siswaMap.get(t.siswaId);
    const kelas = s ? s.kelas : 'Umum';
    const title = getTransaksiSheetTitle(kelas);
    if (!groups[title]) {
      groups[title] = [];
    }
    groups[title].push(t);
  }

  // 3. Write each group
  for (const [sheetTitle, list] of Object.entries(groups)) {
    await ensureSheetExistsWithHeaders(
      spreadsheetId,
      sheetTitle,
      ['ID', 'Siswa_ID', 'Tipe', 'Jumlah', 'Keterangan', 'Tanggal', 'Tanggal_Dibuat'],
      titles,
      accessToken
    );

    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${getRangePath(sheetTitle, 'A2:G')}?valueInputOption=USER_ENTERED`;
    const values = list.map(t => [
      t.id,
      t.siswaId,
      t.tipe,
      t.jumlah,
      t.keterangan,
      t.tanggal,
      t.tanggalDibuat
    ]);

    const writeResponse = await fetch(writeUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    });

    if (!writeResponse.ok) {
      throw new Error(`Failed to overwrite Transaksi in ${sheetTitle}: ${writeResponse.statusText}`);
    }
  }
}
