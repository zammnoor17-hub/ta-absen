
export interface StudentData {
  nama: string;
  kelas: string;
  gender: 'L' | 'P';
}

export interface MasterStudent extends StudentData {
  id: string; // ID unik (biasanya nama-kelas)
}

// Added OfficerStat interface
export interface OfficerStat {
  name: string;
  scanCount: number;
}

export type AttendanceStatus = 
  | 'HADIR' | 'ALPHA' | 'SAKIT' | 'IZIN' // Status Manual Admin
  | 'SCAN_HADIR' | 'SCAN_ALPHA' | 'SCAN_IZIN'; // Status Scan Petugas

export interface AttendanceRecord extends StudentData {
  id?: string;
  timestamp: number;
  jam: string;
  status: AttendanceStatus;
  scannedBy: string;
  officerKelas?: string;
}

export interface AdminAccount {
  username: string;
  password: string;
  role: 'SUPER_ADMIN';
}

export enum Tab {
  DASHBOARD = 'DASHBOARD',
  GENERATOR = 'GENERATOR',
  SCAN = 'SCAN',
  REKAP = 'REKAP',
  ADMIN = 'ADMIN'
}

export type UserRole = 'OFFICER' | 'SUPER_ADMIN';
