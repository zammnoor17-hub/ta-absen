
import React, { useState, useEffect, useRef } from 'react';
import { 
  getAllStats, updateAdminAccount, db, deleteOfficerRecords, 
  subscribeToMasterStudents, saveMasterStudent, deleteMasterStudent,
  subscribeToAttendance, getLocalDateString, updateDailyStatus 
} from '../services/firebase';
import { 
  Users, Key, UserPlus, TrendingUp, UserCheck, GraduationCap, 
  Trash2, Loader2, QrCode, Search, ClipboardList, PlusCircle, 
  Camera, CheckCircle2, XCircle, Info, Save, AlertCircle
} from 'lucide-react';
import { AdminAccount, MasterStudent, AttendanceStatus, AttendanceRecord } from '../types';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';

const AdminTab: React.FC<{ currentAdmin: string }> = ({ currentAdmin }) => {
  // Explicitly type the stats state to ensure TypeScript knows the structure
  const [stats, setStats] = useState<{ totalScans: number; officers: Record<string, any[]> }>({ 
    totalScans: 0, 
    officers: {} 
  });
  const [masterStudents, setMasterStudents] = useState<MasterStudent[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>([]);
  const [subTab, setSubTab] = useState<'OVERVIEW' | 'ABSENSI' | 'STUDENTS' | 'CONFIG'>('OVERVIEW');
  
  const [newStudent, setNewStudent] = useState({ nama: '', kelas: '', gender: 'L' as 'L' | 'P' });
  const [myAccount, setMyAccount] = useState({ username: currentAdmin, password: '' });
  const [search, setSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Cast the setter to handle any data from firebase
    const unsubStats = getAllStats((data: any) => setStats(data));
    const unsubMaster = subscribeToMasterStudents(setMasterStudents);
    const unsubDaily = subscribeToAttendance(getLocalDateString(), setDailyAttendance);
    
    return () => {
      unsubStats();
      unsubMaster();
      unsubDaily();
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // --- Logic Scan Admin ---
  const startAdminScanner = async () => {
    setIsScanning(true);
    setTimeout(async () => {
      try {
        scannerRef.current = new Html5Qrcode("admin-reader", { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 250 } },
          async (text) => {
            try {
              const data = JSON.parse(text);
              if (data.nama && data.kelas) {
                const id = `${data.nama}-${data.kelas}`.replace(/[.#$/[\]]/g, "_");
                await saveMasterStudent({ ...data, id });
              }
            } catch (e) {
              console.error("QR invalid");
            }
          },
          () => {}
        );
      } catch (err) {
        setIsScanning(false);
      }
    }, 150);
  };

  const stopAdminScanner = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().then(() => setIsScanning(false)).catch(() => setIsScanning(false));
    } else {
      setIsScanning(false);
    }
  };

  // --- Manual Add ---
  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.nama || !newStudent.kelas) return;
    const id = `${newStudent.nama}-${newStudent.kelas}`.replace(/[.#$/[\]]/g, "_");
    await saveMasterStudent({ ...newStudent, id });
    setNewStudent({ nama: '', kelas: '', gender: 'L' });
  };

  // --- Attendance Status Toggle ---
  const toggleStatus = async (student: MasterStudent, newStatus: AttendanceStatus) => {
    const now = new Date();
    const record: AttendanceRecord = {
      nama: student.nama,
      kelas: student.kelas,
      gender: student.gender,
      timestamp: now.getTime(),
      jam: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      status: newStatus,
      scannedBy: `ADMIN_${currentAdmin}`,
      officerKelas: 'ADMIN'
    };
    await updateDailyStatus(student.id, record);
  };

  const getStatusOfStudent = (studentId: string): AttendanceStatus => {
    const record = dailyAttendance.find(r => r.id === studentId || `${r.nama}-${r.kelas}`.replace(/[.#$/[\]]/g, "_") === studentId);
    return record ? record.status : 'HADIR';
  };

  const filteredMaster = masterStudents.filter(s => 
    s.nama.toLowerCase().includes(search.toLowerCase()) || 
    s.kelas.toLowerCase().includes(search.toLowerCase())
  );

  const isWeekend = () => {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  };

  return (
    <div className="space-y-6 pb-32 max-w-4xl mx-auto px-2">
      {/* Navigation Pills */}
      <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-1.5 rounded-[2rem] border border-slate-200 dark:border-white/5 overflow-x-auto no-scrollbar gap-1 shadow-sm">
        <AdminNavBtn active={subTab === 'OVERVIEW'} onClick={() => setSubTab('OVERVIEW')} label="Stats" icon={<TrendingUp size={14}/>} />
        <AdminNavBtn active={subTab === 'ABSENSI'} onClick={() => setSubTab('ABSENSI')} label="Daftar Absen" icon={<ClipboardList size={14}/>} />
        <AdminNavBtn active={subTab === 'STUDENTS'} onClick={() => setSubTab('STUDENTS')} label="Data Siswa" icon={<PlusCircle size={14}/>} />
        <AdminNavBtn active={subTab === 'CONFIG'} onClick={() => setSubTab('CONFIG')} label="Akun" icon={<Key size={14}/>} />
      </div>

      <AnimatePresence mode="wait">
        {subTab === 'OVERVIEW' && (
          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Total Scan" value={stats.totalScans} icon={<TrendingUp size={24}/>} color="emerald" />
              <StatCard label="Master Siswa" value={masterStudents.length} icon={<Users size={24}/>} color="blue" />
            </div>

            <div className="glass-card p-8 rounded-[2.5rem] border border-white/10">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                 <GraduationCap size={18} className="text-emerald-500" /> Kinerja Petugas
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.officers || {}).map(([kelas, officers]) => (
                  <div key={kelas} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-white/5">
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mb-3 uppercase tracking-widest">KELAS {kelas}</p>
                    {(officers as any[]).map((o: any) => (
                      <div key={o.name} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{o.name}</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">{o.scanCount} Scans</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'ABSENSI' && (
          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-6">
            <div className="glass-card p-6 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Cari nama/kelas di daftar absen..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black outline-none focus:border-emerald-500 text-slate-900 dark:text-white uppercase" />
              </div>
            </div>

            {isWeekend() && (
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex items-center gap-3">
                <AlertCircle className="text-amber-500" />
                <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest leading-tight">Sabtu/Minggu: Status Tidak Akan Berpengaruh Pada Rekap Utama.</p>
              </div>
            )}

            <div className="space-y-3">
              {filteredMaster.length === 0 ? (
                <div className="text-center py-20">
                   <Info size={40} className="mx-auto text-slate-200 mb-4" />
                   <p className="text-[10px] font-black text-slate-400 uppercase">Belum ada siswa di Master Data</p>
                </div>
              ) : (
                filteredMaster.map(student => {
                  const status = getStatusOfStudent(student.id);
                  return (
                    <div key={student.id} className="glass-card p-4 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg ${student.gender === 'L' ? 'bg-blue-600' : 'bg-pink-600'}`}>{student.nama.charAt(0)}</div>
                        <div>
                          <h4 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate max-w-[150px]">{student.nama}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{student.kelas}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBtn label="H" active={status === 'HADIR'} onClick={() => toggleStatus(student, 'HADIR')} color="bg-emerald-500" />
                        <StatusBtn label="A" active={status === 'ALPHA'} onClick={() => toggleStatus(student, 'ALPHA')} color="bg-red-500" />
                        <StatusBtn label="S" active={status === 'SAKIT'} onClick={() => toggleStatus(student, 'SAKIT')} color="bg-amber-500" />
                        <StatusBtn label="I" active={status === 'IZIN'} onClick={() => toggleStatus(student, 'IZIN')} color="bg-blue-500" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {subTab === 'STUDENTS' && (
          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Admin Scanner Section */}
               <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 flex flex-col items-center">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Scan Cepat Tambah Siswa</h3>
                  {isScanning ? (
                    <div className="w-full flex flex-col items-center gap-4">
                       <div id="admin-reader" className="w-full aspect-square bg-slate-900 rounded-[2rem] overflow-hidden border-4 border-emerald-500"></div>
                       <button onClick={stopAdminScanner} className="w-full py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl font-black text-[10px] uppercase">Hentikan Kamera</button>
                    </div>
                  ) : (
                    <button onClick={startAdminScanner} className="w-32 h-32 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/20 active:scale-90 transition-all">
                       <Camera size={40} />
                    </button>
                  )}
                  <p className="mt-4 text-[9px] font-bold text-slate-400 text-center uppercase">Scan QR Card X-Pray untuk otomatis masuk ke database master.</p>
               </div>

               {/* Manual Add Form */}
               <div className="glass-card p-8 rounded-[2.5rem] border border-white/10">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Input Manual</h3>
                  <form onSubmit={handleAddManual} className="space-y-4">
                    <input type="text" placeholder="NAMA LENGKAP" value={newStudent.nama} onChange={e => setNewStudent({...newStudent, nama: e.target.value.toUpperCase()})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black outline-none focus:border-emerald-500 text-slate-900 dark:text-white" />
                    <div className="grid grid-cols-2 gap-3">
                       <input type="text" placeholder="KELAS" value={newStudent.kelas} onChange={e => setNewStudent({...newStudent, kelas: e.target.value.toUpperCase()})} className="px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black outline-none focus:border-emerald-500 text-slate-900 dark:text-white" />
                       <select value={newStudent.gender} onChange={e => setNewStudent({...newStudent, gender: e.target.value as any})} className="px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black outline-none focus:border-emerald-500 text-slate-900 dark:text-white appearance-none">
                          <option value="L">LAKI-LAKI</option>
                          <option value="P">PEREMPUAN</option>
                       </select>
                    </div>
                    <button className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">
                       <Save size={16} /> Simpan Manual
                    </button>
                  </form>
               </div>
            </div>

            {/* Master List Management */}
            <div className="glass-card p-8 rounded-[3rem] border border-white/10">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <Users size={18} className="text-emerald-500" /> Database Master
                  </h3>
                  <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-4 py-1 rounded-full text-slate-500">{masterStudents.length} Siswa</span>
               </div>
               <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
                  {masterStudents.map(student => (
                    <div key={student.id} className="p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl flex items-center justify-between border border-transparent hover:border-slate-200 transition-all">
                       <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-400 w-6">#{masterStudents.indexOf(student)+1}</span>
                          <div>
                             <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase">{student.nama}</p>
                             <p className="text-[9px] font-bold text-emerald-600">{student.kelas}</p>
                          </div>
                       </div>
                       <button onClick={() => deleteMasterStudent(student.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                       </button>
                    </div>
                  ))}
               </div>
            </div>
          </motion.div>
        )}

        {subTab === 'CONFIG' && (
          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-6">
            <div className="glass-card p-8 rounded-[3rem] border border-white/10">
               <h3 className="text-sm font-black text-slate-900 dark:text-white mb-8 flex items-center gap-2">
                  <Key size={18} className="text-amber-500" /> Pengaturan Akun Admin
               </h3>
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 await updateAdminAccount(currentAdmin, { username: myAccount.username, password: myAccount.password, role: 'SUPER_ADMIN' });
               }} className="space-y-5">
                  <input type="text" placeholder="Username" value={myAccount.username} onChange={e => setMyAccount({...myAccount, username: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none" />
                  <input type="password" placeholder="Password Baru" value={myAccount.password} onChange={e => setMyAccount({...myAccount, password: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none" />
                  <button className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">Update Profil Saya</button>
               </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminNavBtn = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`px-5 py-3 rounded-[1.5rem] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${active ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20' : 'text-slate-500'}`}>
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, icon, color }: any) => {
  const themes: any = {
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40'
  };
  return (
    <div className="glass-card rounded-[2.5rem] p-6 border border-white/10">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${themes[color]}`}>{icon}</div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white">{value}</h2>
    </div>
  );
};

const StatusBtn = ({ label, active, onClick, color }: any) => (
  <button 
    onClick={onClick} 
    className={`w-9 h-9 md:w-10 md:h-10 rounded-xl font-black text-xs transition-all flex items-center justify-center border-2 ${
      active ? `${color} text-white border-white/20 shadow-lg scale-110 z-10` : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent hover:bg-slate-200'
    }`}
  >
    {label}
  </button>
);

export default AdminTab;
