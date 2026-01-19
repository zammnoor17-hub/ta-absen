
import React, { useState, useEffect } from 'react';
import { subscribeToAttendance, getLocalDateString, getLeaderboards, OfficerStat } from '../services/firebase';
import { AttendanceRecord, Tab } from '../types';
import { Users, Clock, Calendar, Activity, Sparkles, Zap, ArrowUpRight, Trophy, TrendingUp, X, Crown, Medal, HeartPulse, FileText, Ghost } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardTab: React.FC<{ changeTab: (tab: Tab) => void; userName: string }> = ({ changeTab, userName }) => {
  const [stats, setStats] = useState({ hadir: 0, sakit: 0, izin: 0, alpha: 0, total: 0 });
  const [dailyLB, setDailyLB] = useState<OfficerStat[]>([]);
  const [weeklyLB, setWeeklyLB] = useState<OfficerStat[]>([]);
  const [recent, setRecent] = useState<AttendanceRecord[]>([]);
  const [lbType, setLbType] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [loading, setLoading] = useState(true);

  const TARGET = 45; 

  useEffect(() => {
    const unsub = subscribeToAttendance(getLocalDateString(), (records) => {
      setStats({
        // Agregasi Status: Scan + Manual
        hadir: records.filter(r => r.status === 'HADIR' || r.status === 'SCAN_HADIR').length,
        sakit: records.filter(r => r.status === 'SAKIT').length,
        izin: records.filter(r => r.status === 'IZIN' || r.status === 'SCAN_IZIN').length,
        alpha: records.filter(r => r.status === 'ALPHA' || r.status === 'SCAN_ALPHA').length,
        total: records.length
      });
      setRecent(records.slice(-5).reverse());
      setLoading(false);
    });

    const unsubL = getLeaderboards((d, w) => { setDailyLB(d); setWeeklyLB(w); });

    return () => { unsub(); unsubL(); };
  }, []);

  const progress = Math.min((stats.hadir / TARGET) * 100, 100);
  const activeLB = lbType === 'DAILY' ? dailyLB : weeklyLB;

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'SCAN_HADIR': return 'SHOLAT';
      case 'SCAN_ALPHA': return 'TIDAK SHOLAT';
      case 'SCAN_IZIN': return 'HALANGAN';
      case 'HADIR': return 'HADIR (M)';
      case 'ALPHA': return 'ALPHA (M)';
      case 'IZIN': return 'IZIN (M)';
      case 'SAKIT': return 'SAKIT (M)';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 pb-24 px-2 max-w-lg mx-auto">
      {/* Premium Hero Card */}
      <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} className="glass-card rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group border border-white/20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-emerald-500/20 transition-all duration-700"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-emerald-200 dark:border-emerald-800">
              <Sparkles size={12} /> XPRAY SYSTEM
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 leading-tight">Halo, {userName}!</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Target Hari Ini: <span className="text-emerald-600 font-black">{TARGET} SISWA</span></p>
            
            <button onClick={() => changeTab(Tab.SCAN)} className="px-10 py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-[1.5rem] font-black text-[11px] tracking-widest uppercase flex items-center gap-2 shadow-2xl hover:scale-105 active:scale-95 transition-all">
              Buka Scanner <ArrowUpRight size={16} />
            </button>
          </div>
          
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="50%" cy="50%" r="42%" strokeWidth="10" fill="transparent" className="text-slate-100 dark:text-slate-800" stroke="currentColor" />
              <motion.circle cx="50%" cy="50%" r="42%" strokeWidth="12" fill="transparent" strokeDasharray="264%" initial={{ strokeDashoffset: '264%' }} animate={{ strokeDashoffset: `${264 - (264 * progress) / 100}%` }} className="text-emerald-500" strokeLinecap="round" stroke="currentColor" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{Math.round(progress)}%</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Hadir</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modern Grid Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Hadir/Sholat" value={stats.hadir} icon={<Zap size={22}/>} color="emerald" />
        <StatCard label="Sakit" value={stats.sakit} icon={<HeartPulse size={22}/>} color="amber" />
        <StatCard label="Izin/Halangan" value={stats.izin} icon={<FileText size={22}/>} color="blue" />
        <StatCard label="Alpha/Tdk Sholat" value={stats.alpha} icon={<Ghost size={22}/>} color="red" />
      </div>

      {/* Leaderboard & Recent */}
      <div className="glass-card rounded-[3rem] p-8 shadow-2xl border border-white/10">
        <h3 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
          <Clock size={20} className="text-emerald-500" /> Histori Terbaru
        </h3>
        <div className="space-y-4">
          {recent.map((record) => (
            <div key={record.id} className="flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-800/40 rounded-[1.8rem] border border-transparent hover:bg-white dark:hover:bg-slate-800 transition-all border-white/5">
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ${record.gender === 'L' ? 'bg-blue-600' : 'bg-pink-600'}`}>{record.nama.charAt(0)}</div>
                <div className="overflow-hidden">
                  <h4 className="font-black text-slate-800 dark:text-white text-[11px] uppercase truncate max-w-[120px] mb-0.5">{record.nama}</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{record.jam}</p>
                </div>
              </div>
              <div className={`text-[8px] font-black px-3 py-1.5 rounded-xl shadow-sm ${
                record.status.startsWith('SCAN_HADIR') ? 'bg-emerald-600 text-white' : 
                record.status.startsWith('SCAN_ALPHA') ? 'bg-red-600 text-white' : 
                record.status === 'HADIR' ? 'bg-teal-600 text-white' :
                'bg-slate-500 text-white'
              }`}>
                {getStatusLabel(record.status)}
              </div>
            </div>
          ))}
          {recent.length === 0 && <p className="text-center py-10 text-[10px] font-black uppercase text-slate-400 tracking-widest">Belum Ada Scan Hari Ini</p>}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => {
  const themes: any = {
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
    red: 'text-red-600 bg-red-50 dark:bg-red-950/40'
  };
  return (
    <motion.div whileHover={{ y: -5 }} className="glass-card rounded-[2.5rem] p-6 shadow-xl border border-white/10 hover:border-emerald-500/30 transition-all">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${themes[color]}`}>{icon}</div>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-tight">{label}</p>
      <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</p>
    </motion.div>
  );
};

export default DashboardTab;
