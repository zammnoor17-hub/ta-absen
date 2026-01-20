
import React, { useState, useEffect } from 'react';
import { subscribeToAttendance, getLocalDateString, getLeaderboards, OfficerStat } from '../services/firebase';
import { AttendanceRecord, Tab } from '../types';
import { Clock, Sparkles, Zap, ArrowUpRight, Trophy, HeartPulse, FileText, Ghost, Flower2, Users, Medal, Crown, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardTab: React.FC<{ changeTab: (tab: Tab) => void; userName: string }> = ({ changeTab, userName }) => {
  const [stats, setStats] = useState({ 
    sholat: 0, 
    tidakSholat: 0, 
    haid: 0, 
    izin: 0, 
    alpa: 0, 
    sakit: 0 
  });
  const [totalToday, setTotalToday] = useState(0);
  const [dailyLB, setDailyLB] = useState<OfficerStat[]>([]);
  const [recent, setRecent] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe ke absensi hari ini
    const unsubAbsen = subscribeToAttendance(getLocalDateString(), (records) => {
      setTotalToday(records.length);
      setStats({
        sholat: records.filter(r => r.status === 'SCAN_HADIR' || r.status === 'HADIR').length,
        tidakSholat: records.filter(r => r.status === 'SCAN_ALPHA').length,
        haid: records.filter(r => r.status === 'SCAN_IZIN').length,
        izin: records.filter(r => r.status === 'IZIN').length,
        alpa: records.filter(r => r.status === 'ALPHA').length,
        sakit: records.filter(r => r.status === 'SAKIT').length
      });
      setRecent(records.slice(-5).reverse());
      setLoading(false);
    });

    // Subscribe ke leaderboard harian
    const unsubLB = getLeaderboards((daily) => {
      setDailyLB(daily);
    });

    return () => {
      unsubAbsen();
      unsubLB();
    };
  }, []);

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'SCAN_HADIR': return 'SHOLAT';
      case 'SCAN_ALPHA': return 'TDK SHOLAT';
      case 'SCAN_IZIN': return 'HAID';
      case 'HADIR': return 'SHOLAT (M)';
      case 'ALPHA': return 'ALPA (M)';
      case 'IZIN': return 'IZIN (M)';
      case 'SAKIT': return 'SAKIT (M)';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Memuat Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 px-2 max-w-lg mx-auto">
      {/* Hero Card with Daily Processed Count */}
      <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} className="glass-card rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group border border-white/20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-emerald-500/20 transition-all duration-700"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-emerald-200 dark:border-emerald-800">
            <Sparkles size={12} /> X-PRAY PRO
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 leading-tight">Halo, {userName}!</h1>
          <div className="bg-slate-100 dark:bg-slate-800/50 px-6 py-3 rounded-2xl mb-8 border border-slate-200 dark:border-white/5">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Siswa Terproses Hari Ini</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{totalToday} SISWA</p>
          </div>

          <button onClick={() => changeTab(Tab.SCAN)} className="w-full py-5 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black text-[11px] tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
            Mulai Scan QR <ArrowUpRight size={16} />
          </button>
        </div>
      </motion.div>

      {/* 6 Grid Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Sholat" value={stats.sholat} icon={<Zap size={18}/>} color="emerald" />
        <StatCard label="Tdk Sholat" value={stats.tidakSholat} icon={<Ghost size={18}/>} color="red" />
        <StatCard label="Haid" value={stats.haid} icon={<Flower2 size={18}/>} color="fuchsia" />
        <StatCard label="Izin" value={stats.izin} icon={<FileText size={18}/>} color="blue" />
        <StatCard label="Alpa" value={stats.alpa} icon={<Users size={18}/>} color="orange" />
        <StatCard label="Sakit" value={stats.sakit} icon={<HeartPulse size={18}/>} color="amber" />
      </div>

      {/* Top Petugas (Leaderboard) */}
      <div className="glass-card rounded-[2.5rem] p-6 shadow-xl border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" /> Top Petugas Hari Ini
          </h3>
          <Medal size={16} className="text-slate-300" />
        </div>
        
        <div className="space-y-3">
          {dailyLB.length > 0 ? dailyLB.map((officer, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-transparent hover:border-emerald-500/20 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${
                  index === 0 ? 'bg-amber-400 text-white shadow-lg shadow-amber-400/20' : 
                  index === 1 ? 'bg-slate-400 text-white' : 
                  'bg-orange-400 text-white'
                }`}>
                  {index === 0 ? <Crown size={14} /> : index + 1}
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate max-w-[120px]">{officer.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{officer.scanCount}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase">Scans</span>
              </div>
            </div>
          )) : (
            <p className="text-center py-4 text-[9px] font-black uppercase text-slate-400">Belum ada aktifitas</p>
          )}
        </div>
      </div>

      {/* Recent Histori */}
      <div className="glass-card rounded-[2.5rem] p-6 shadow-xl border border-white/10">
        <h3 className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
          <Clock size={16} className="text-emerald-500" /> Histori Terkini
        </h3>
        <div className="space-y-3">
          {recent.map((record, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md ${record.gender === 'L' ? 'bg-blue-600' : 'bg-pink-600'}`}>
                  {record.nama.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-black text-slate-800 dark:text-white text-[10px] uppercase truncate max-w-[100px] mb-0.5">{record.nama}</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase">{record.jam} • {record.kelas}</p>
                </div>
              </div>
              <div className={`text-[7px] font-black px-2 py-1 rounded-lg ${
                record.status.includes('HADIR') ? 'bg-emerald-500 text-white' : 
                record.status.includes('ALPHA') ? 'bg-red-500 text-white' : 
                record.status.includes('IZIN') ? 'bg-fuchsia-500 text-white' :
                'bg-slate-500 text-white'
              }`}>
                {getStatusLabel(record.status)}
              </div>
            </div>
          ))}
          {recent.length === 0 && <p className="text-center py-6 text-[9px] font-black uppercase text-slate-400">Belum Ada Absensi</p>}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => {
  const themes: any = {
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/10',
    fuchsia: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-500/10',
    slate: 'text-slate-600 bg-slate-50 dark:bg-slate-900/40 border-slate-500/10',
    red: 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-500/10',
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-500/10',
    orange: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-500/10',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-500/10'
  };
  return (
    <motion.div whileHover={{ scale: 1.02 }} className={`glass-card rounded-[2rem] p-4 shadow-lg border ${themes[color]} transition-all flex flex-col items-center text-center`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-inner ${themes[color]}`}>{icon}</div>
      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-tight">{label}</p>
      <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</p>
    </motion.div>
  );
};

export default DashboardTab;
