
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import { AttendanceRecord, AdminAccount, MasterStudent, AttendanceStatus, OfficerStat } from '../types';

export type { OfficerStat };

const firebaseConfig = {
  apiKey: "AIzaSyBCNPKx6Qnl_mPdGwuLlqOx9cI7fRhcwOE",
  authDomain: "absfor.firebaseapp.com",
  databaseURL: "https://absfor-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "absfor",
  storageBucket: "absfor.firebasestorage.app",
  messagingSenderId: "815942958330",
  appId: "1:815942958330:web:69ead6ba0a7af82e3e9d43",
};

const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
export const db = app.database();

export const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

// --- Master Students ---
export const saveMasterStudent = async (student: MasterStudent) => {
  await db.ref(`config/master_students/${student.id}`).set(student);
};

export const deleteMasterStudent = async (id: string) => {
  await db.ref(`config/master_students/${id}`).remove();
};

export const subscribeToMasterStudents = (callback: (students: MasterStudent[]) => void) => {
  const ref = db.ref('config/master_students');
  const handler = ref.on('value', (snap) => {
    const data = snap.val();
    const students = data ? Object.values(data) as MasterStudent[] : [];
    callback(students.sort((a, b) => a.nama.localeCompare(b.nama)));
  });
  return () => ref.off('value', handler);
};

// --- Attendance Logic ---
export const updateDailyStatus = async (studentId: string, record: AttendanceRecord) => {
  const dateStr = getLocalDateString();
  await db.ref(`absensi/${dateStr}/${studentId}`).set(record);
};

export const saveAttendance = async (record: Omit<AttendanceRecord, 'id'>, id?: string) => {
  const dateStr = getLocalDateString();
  const path = `absensi/${dateStr}`;
  const targetId = id || `${record.nama}-${record.kelas}`.replace(/[.#$/[\]]/g, "_");
  await db.ref(`${path}/${targetId}`).set(record);
};

export const checkIfAlreadyScanned = async (nama: string, kelas: string): Promise<AttendanceRecord | null> => {
  try {
    const dateStr = getLocalDateString();
    const snapshot = await db.ref(`absensi/${dateStr}`).once('value');
    const data = snapshot.val();
    if (!data) return null;
    const records = Object.entries(data).map(([key, value]: [string, any]) => ({ id: key, ...value }));
    return records.find(r => r.nama === nama && r.kelas === kelas) || null;
  } catch (e) { return null; }
};

export const subscribeToAttendance = (dateStr: string, callback: (data: AttendanceRecord[]) => void) => {
  const query = db.ref(`absensi/${dateStr}`).orderByChild('timestamp');
  const handler = query.on('value', (snapshot) => {
    const data = snapshot.val();
    const records = data ? Object.entries(data).map(([key, value]: [string, any]) => ({ id: key, ...value })) : [];
    callback(records as AttendanceRecord[]);
  });
  return () => query.off('value', handler);
};

// --- Admin Management ---
export const verifyAdmin = async (u: string, p: string): Promise<boolean> => {
  const snap = await db.ref(`config/admins/${u}`).once('value');
  const data = snap.val();
  return data && data.password === p;
};

export const updateAdminAccount = async (username: string, data: AdminAccount) => {
  await db.ref(`config/admins/${username}`).set(data);
};

export const subscribeToAdmins = (callback: (admins: AdminAccount[]) => void) => {
  const ref = db.ref('config/admins');
  const handler = ref.on('value', (snap) => {
    const data = snap.val();
    const admins = data ? Object.values(data) as AdminAccount[] : [];
    callback(admins);
  });
  return () => ref.off('value', handler);
};

export const deleteAdminAccount = async (username: string) => {
  await db.ref(`config/admins/${username}`).remove();
};

// --- Officer Management ---
export const registerOfficer = async (u: string, p: string, k: string) => {
  await db.ref(`config/officers/${u}`).set({ username: u, password: p, kelas: k });
};

export const verifyOfficer = async (u: string, p: string) => {
  const snap = await db.ref(`config/officers/${u}`).once('value');
  const data = snap.val();
  return (data && data.password === p) ? data : null;
};

// --- Stats & Leaderboard ---
export const getLeaderboards = (callback: (daily: OfficerStat[]) => void) => {
  const dateStr = getLocalDateString();
  const ref = db.ref(`absensi/${dateStr}`);
  const handler = ref.on('value', (snap) => {
    const data = snap.val();
    if (!data) return callback([]);
    const counts: Record<string, number> = {};
    Object.values(data).forEach((r: any) => {
      if (r.scannedBy && !r.scannedBy.startsWith('ADMIN_')) {
        counts[r.scannedBy] = (counts[r.scannedBy] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, scanCount: count }))
      .sort((a, b) => b.scanCount - a.scanCount);
    callback(sorted);
  });
  return () => ref.off('value', handler);
};

export const getAllStats = (callback: (data: any) => void) => {
  const ref = db.ref('absensi');
  const handler = ref.on('value', (snap) => {
    const data = snap.val() || {};
    let total = 0;
    const officers: Record<string, any> = {};
    
    Object.values(data).forEach((day: any) => {
      Object.values(day).forEach((r: any) => {
        total++;
        if (r.officerKelas && r.officerKelas !== 'ADMIN') {
          if (!officers[r.officerKelas]) officers[r.officerKelas] = {};
          officers[r.officerKelas][r.scannedBy] = (officers[r.officerKelas][r.scannedBy] || 0) + 1;
        }
      });
    });

    const formattedOfficers: Record<string, any[]> = {};
    Object.entries(officers).forEach(([kelas, users]) => {
      formattedOfficers[kelas] = Object.entries(users as any).map(([name, count]) => ({ name, scanCount: count }));
    });

    callback({ totalScans: total, officers: formattedOfficers });
  });
  return () => ref.off('value', handler);
};
