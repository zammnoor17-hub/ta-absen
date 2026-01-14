
// Import Firebase v8 compat API
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import { AttendanceRecord, AdminAccount } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyDkmJDCUEN0FprTFKxlOEkaoU3JndvezAg",
  authDomain: "absen-4c88a.firebaseapp.com",
  databaseURL: "https://absen-4c88a-default-rtdb.firebaseio.com/",
  projectId: "absen-4c88a",
  storageBucket: "absen-4c88a.firebasestorage.app",
  messagingSenderId: "189025380230",
  appId: "1:189025380230:web:c15de7226d3ccfd42cae07"
};

const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
export const db = app.database();

// Helper for Local ISO Date
export const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

// --- Attendance Functions ---
export const saveAttendance = async (record: Omit<AttendanceRecord, 'id'>, id?: string) => {
  const dateStr = getLocalDateString();
  const path = `absensi/${dateStr}`;
  if (id) {
    await db.ref(`${path}/${id}`).set(record);
  } else {
    await db.ref(path).push(record);
  }
};

export const checkIfAlreadyScanned = async (nama: string, kelas: string): Promise<AttendanceRecord | null> => {
  try {
    const dateStr = getLocalDateString();
    const snapshot = await db.ref(`absensi/${dateStr}`).once('value');
    const data = snapshot.val();
    if (!data) return null;
    
    const records = Object.entries(data).map(([key, value]: [string, any]) => ({ id: key, ...value }));
    return records.find(r => r.nama === nama && r.kelas === kelas) || null;
  } catch (e) {
    console.error("Duplicate check error:", e);
    return null;
  }
};

export const subscribeToAttendance = (dateStr: string, callback: (data: AttendanceRecord[]) => void) => {
  const path = `absensi/${dateStr}`;
  const query = db.ref(path).orderByChild('timestamp');
  const handler = query.on('value', (snapshot) => {
    const data = snapshot.val();
    const records = data ? Object.entries(data).map(([key, value]: [string, any]) => ({ id: key, ...value })) : [];
    callback(records.reverse());
  });
  return () => query.off('value', handler);
};

// --- Officer Account Functions ---
export const registerOfficer = async (username: string, pass: string, kelas: string) => {
  const officerRef = db.ref(`config/officers/${username}`);
  const snapshot = await officerRef.once('value');
  if (snapshot.exists()) throw new Error("Username sudah terpakai");
  
  await officerRef.set({
    username,
    password: pass,
    kelas,
    role: 'OFFICER'
  });
};

export const verifyOfficer = async (username: string, pass: string): Promise<{username: string, kelas: string} | null> => {
  try {
    const officerRef = db.ref(`config/officers/${username}`);
    const snapshot = await officerRef.once('value');
    const data = snapshot.val();
    if (data && data.password === pass) {
      return { username: data.username, kelas: data.kelas };
    }
    return null;
  } catch (e) {
    throw new Error("Gagal terhubung ke Database. Cek koneksi atau Rules.");
  }
};

// --- Admin Auth Functions ---
export const verifyAdmin = async (username: string, pass: string): Promise<boolean> => {
  try {
    const adminRef = db.ref('config/admins');
    const snapshot = await adminRef.once('value');
    const admins = snapshot.val();
    
    // Jika admin belum ada sama sekali, buat default admin
    if (!admins) {
      if (username === 'admin' && pass === '123') {
        await db.ref('config/admins/admin').set({ username: 'admin', password: '123', role: 'SUPER_ADMIN' });
        return true;
      }
      return false;
    }

    return Object.values(admins).some((a: any) => a.username === username && a.password === pass);
  } catch (e) {
    throw new Error("Akses Ditolak. Pastikan Database Rules sudah diset ke 'true'.");
  }
};

export const updateAdminAccount = async (oldUsername: string, newData: AdminAccount) => {
  await db.ref(`config/admins/${oldUsername}`).set(null);
  await db.ref(`config/admins/${newData.username}`).set(newData);
};

// --- Leaderboard & Stats ---
export interface OfficerStat {
  name: string;
  scanCount: number;
}

export const getDailyLeaderboard = (callback: (data: OfficerStat[]) => void) => {
  const dateStr = getLocalDateString();
  const absensiRef = db.ref(`absensi/${dateStr}`);
  
  const handler = absensiRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    const counts: Record<string, number> = {};
    Object.values(data).forEach((r: any) => {
      if (r.scannedBy) {
        counts[r.scannedBy] = (counts[r.scannedBy] || 0) + 1;
      }
    });
    const leaderboard = Object.entries(counts)
      .map(([name, scanCount]) => ({ name, scanCount }))
      .sort((a, b) => b.scanCount - a.scanCount)
      .slice(0, 5);
    callback(leaderboard);
  });
  return () => absensiRef.off('value', handler);
};

export const getWeeklyLeaderboard = (callback: (data: OfficerStat[]) => void) => {
  const absensiRef = db.ref('absensi');
  const handler = absensiRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    const last7Days = Array.from({ length: 7 }, (_, i) => getLocalDateString(i));
    const counts: Record<string, number> = {};
    last7Days.forEach(dateKey => {
      if (data[dateKey]) {
        Object.values(data[dateKey]).forEach((r: any) => {
          if (r.scannedBy) {
            counts[r.scannedBy] = (counts[r.scannedBy] || 0) + 1;
          }
        });
      }
    });
    const leaderboard = Object.entries(counts)
      .map(([name, scanCount]) => ({ name, scanCount }))
      .sort((a, b) => b.scanCount - a.scanCount)
      .slice(0, 5);
    callback(leaderboard);
  });
  return () => absensiRef.off('value', handler);
};

export const getAllStats = (callback: (data: { totalScans: number, officers: Record<string, OfficerStat[]> }) => void) => {
  const absensiRef = db.ref('absensi');
  const handler = absensiRef.on('value', (snapshot) => {
    const data = snapshot.val();
    let total = 0;
    const officerDetailsMap: Record<string, Record<string, number>> = {};
    if (data) {
      Object.values(data).forEach((dayRecords: any) => {
        const records = Object.values(dayRecords) as AttendanceRecord[];
        total += records.length;
        records.forEach((r) => { 
          if(r.scannedBy) {
            const cls = r.officerKelas || 'Tanpa Kelas';
            if (!officerDetailsMap[cls]) officerDetailsMap[cls] = {};
            if (!officerDetailsMap[cls][r.scannedBy]) officerDetailsMap[cls][r.scannedBy] = 0;
            officerDetailsMap[cls][r.scannedBy]++;
          }
        });
      });
    }
    const officers: Record<string, OfficerStat[]> = {};
    Object.keys(officerDetailsMap).forEach(cls => {
      officers[cls] = Object.entries(officerDetailsMap[cls]).map(([name, scanCount]) => ({
        name,
        scanCount
      })).sort((a, b) => b.scanCount - a.scanCount);
    });
    callback({ totalScans: total, officers });
  });
  return () => absensiRef.off('value', handler);
};

export const deleteOfficerRecords = async (officerName: string) => {
  const updates: Record<string, any> = {};
  updates[`config/officers/${officerName}`] = null;
  const absensiRef = db.ref('absensi');
  const snapshot = await absensiRef.once('value');
  const data = snapshot.val();
  if (data) {
    Object.keys(data).forEach((dateStr) => {
      const dayRecords = data[dateStr];
      Object.keys(dayRecords).forEach((recordId) => {
        if (dayRecords[recordId].scannedBy === officerName) {
          updates[`absensi/${dateStr}/${recordId}`] = null;
        }
      });
    });
  }
  await db.ref().update(updates);
};
