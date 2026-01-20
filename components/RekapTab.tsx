
import React, { useState, useEffect } from 'react';
import { subscribeToAttendance, getLocalDateString } from '../services/firebase';
import { AttendanceRecord, AttendanceStatus } from '../types';
import { Search, Calendar, FileSpreadsheet, Loader2, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';

const RekapTab: React.FC = () => {
  const [date, setDate] = useState(getLocalDateString());
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAttendance(date, (records) => {
      // FIX: Karena subscribeToAttendance sekarang kronologis (urutan waktu),
      // RekapTab harus mengurutkan alfabetis A-Z di sini agar tetap rapi.
      const sorted = [...records].sort((a, b) => a.nama.localeCompare(b.nama));
      setData(sorted);
      setLoading(false);
    });
    return () => unsub();
  }, [date]);

  const filtered = data.filter(r => 
    r.nama.toLowerCase().includes(search.toLowerCase()) || 
    r.kelas.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusConfig = (status: AttendanceStatus) => {
    switch(status) {
      case 'SCAN_HADIR': return { label: 'SHOLAT', color: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' };
      case 'SCAN_ALPHA': return { label: 'TIDAK SHOLAT', color: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' };
      case 'SCAN_IZIN': return { label: 'HALANGAN', color: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' };
      case 'HADIR': return { label: 'HADIR (M)', color: 'bg-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300' };
      case 'ALPHA': return { label: 'ALPHA.', color: 'bg-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' };
      case 'IZIN': return { label: 'IZIN.', color: 'bg-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300' };
      case 'SAKIT': return { label: 'SAKIT.', color: 'bg-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300' };
      default: return { label: status, color: 'bg-slate-500', bg: 'bg-slate-50', text: 'text-slate-600' };
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({
      'Nama Siswa': r.nama,
      'Kelas': r.kelas,
      'Status': getStatusConfig(r.status).label,
      'Metode': r.status.startsWith('SCAN_') ? 'Scan QR' : 'Manual Admin',
      'Jam Absen': r.jam,
      'Petugas': r.scannedBy
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
    XLSX.writeFile(wb, `Rekap_XPray_${date}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-32 px-2 max-w-lg mx-auto">
      {/* Controls Card */}
      <div className="glass-card p-8 rounded-[3rem] shadow-2xl space-y-5 border border-white/20">
        <div className="flex gap-4">
          <div className="relative flex-1 group">
            <Calendar className="absolute left-5 top-4 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-900 dark:text-white transition-all" />
          </div>
          <button onClick={exportExcel} className="p-5 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-90 transition-transform hover:bg-emerald-700">
            <FileSpreadsheet size={22} />
          </button>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-5 top-4 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
          <input type="text" placeholder="Cari nama atau kelas..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-900 dark:text-white transition-all" />
        </div>
      </div>

      {/* List Card */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-24 glass-card rounded-[3rem]">
            <Loader2 size={40} className="animate-spin text-emerald-500 mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Mengambil Data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 glass-card rounded-[3rem] border border-white/10">
            <Search size={48} className="text-slate-200 dark:text-slate-800 mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Tidak Ada Data Ditemukan</p>
          </div>
        ) : (
          filtered.map((r, i) => {
            const config = getStatusConfig(r.status);
            return (
              <motion.div initial={{y:15, opacity:0}} animate={{y:0, opacity:1}} transition={{delay: i * 0.02}} key={r.id} className="glass-card p-5 rounded-[2rem] flex items-center justify-between group border border-white/10 hover:bg-white dark:hover:bg-slate-800 transition-all">
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-[1.4rem] flex items-center justify-center text-white font-black text-xl shadow-lg transform group-hover:rotate-6 transition-transform ${r.gender === 'L' ? 'bg-blue-600' : 'bg-pink-600'}`}>{r.nama.charAt(0)}</div>
                  <div className="overflow-hidden">
                    <h4 className="text-[12px] font-black uppercase text-slate-800 dark:text-white truncate max-w-[140px] mb-0.5">{r.nama}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{r.kelas} • <span className="text-emerald-600 dark:text-emerald-400 font-black">{r.jam}</span></p>
                  </div>
                </div>
                <div className={`text-[8px] font-black px-3 py-2 rounded-xl border-2 shadow-sm ${config.bg} ${config.text} border-current opacity-90`}>
                  {config.label}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RekapTab;
