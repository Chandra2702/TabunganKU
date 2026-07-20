import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  collection, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Siswa, Transaksi } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL */
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection on Boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Firestore operations

// Siswa
export async function saveSiswaToFirestore(userId: string, s: Siswa) {
  const path = `users/${userId}/siswa/${s.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'siswa', s.id), {
      id: s.id,
      nisn: s.nisn,
      nama: s.nama,
      kelas: s.kelas,
      tanggalDibuat: s.tanggalDibuat
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveSiswaBulkToFirestore(userId: string, list: Siswa[]) {
  if (list.length === 0) return;
  const path = `users/${userId}/siswa/BATCH`;
  try {
    const batch = writeBatch(db);
    list.forEach(s => {
      const docRef = doc(db, 'users', userId, 'siswa', s.id);
      batch.set(docRef, {
        id: s.id,
        nisn: s.nisn,
        nama: s.nama,
        kelas: s.kelas,
        tanggalDibuat: s.tanggalDibuat
      });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSiswaFromFirestore(userId: string, id: string) {
  const path = `users/${userId}/siswa/${id}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'siswa', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function getSiswaFromFirestore(userId: string): Promise<Siswa[]> {
  const path = `users/${userId}/siswa`;
  try {
    const querySnapshot = await getDocs(collection(db, 'users', userId, 'siswa'));
    const list: Siswa[] = [];
    querySnapshot.forEach(doc => {
      list.push(doc.data() as Siswa);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// Transaksi
export async function saveTransaksiToFirestore(userId: string, t: Transaksi) {
  const path = `users/${userId}/transaksi/${t.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'transaksi', t.id), {
      id: t.id,
      siswaId: t.siswaId,
      tipe: t.tipe,
      jumlah: t.jumlah,
      keterangan: t.keterangan,
      tanggal: t.tanggal,
      tanggalDibuat: t.tanggalDibuat
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveTransaksiBulkToFirestore(userId: string, list: Transaksi[]) {
  if (list.length === 0) return;
  const path = `users/${userId}/transaksi/BATCH`;
  try {
    const batch = writeBatch(db);
    list.forEach(t => {
      const docRef = doc(db, 'users', userId, 'transaksi', t.id);
      batch.set(docRef, {
        id: t.id,
        siswaId: t.siswaId,
        tipe: t.tipe,
        jumlah: t.jumlah,
        keterangan: t.keterangan,
        tanggal: t.tanggal,
        tanggalDibuat: t.tanggalDibuat
      });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteTransaksiFromFirestore(userId: string, id: string) {
  const path = `users/${userId}/transaksi/${id}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'transaksi', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function getTransaksiFromFirestore(userId: string): Promise<Transaksi[]> {
  const path = `users/${userId}/transaksi`;
  try {
    const querySnapshot = await getDocs(collection(db, 'users', userId, 'transaksi'));
    const list: Transaksi[] = [];
    querySnapshot.forEach(doc => {
      list.push(doc.data() as Transaksi);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// Settings
export async function saveSettingsToFirestore(userId: string, schoolName: string, spreadsheetId: string) {
  const path = `users/${userId}/settings/config`;
  try {
    await setDoc(doc(db, 'users', userId, 'settings', 'config'), {
      schoolName,
      spreadsheetId
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getSettingsFromFirestore(userId: string): Promise<{ schoolName: string; spreadsheetId: string } | null> {
  const path = `users/${userId}/settings/config`;
  try {
    const docSnap = await getDoc(doc(db, 'users', userId, 'settings', 'config'));
    if (docSnap.exists()) {
      return docSnap.data() as { schoolName: string; spreadsheetId: string };
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}
