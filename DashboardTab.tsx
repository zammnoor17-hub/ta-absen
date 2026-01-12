import React, { useState, useEffect } from 'react';
import { subscribeToAttendance, getLocalDateString, getDailyLeaderboard, OfficerStat } from '../services/firebase';
import { AttendanceRecord, Tab } from '../types';
import { Users, Clock, Calendar, Activity, Sparkles, Zap, ArrowUpRight, Trophy, Target, TrendingUp, X } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

interface DashboardProps {
  changeTab: (tab: Tab) => void;
  userName: string;
}

const formatDateFull = (date: Date) => {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

const DashboardTab: React.FC<DashboardProps> = ({ changeTab, userName }) => {
  const [stats, setStats] = useState({ hadir: 0, halangan: 0, bolos: 0, total: 0 });
  const [leaderboard, setLeaderboard] = useState<OfficerStat[]>([]);
  const [recent, setRecent] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const TARGET_DAILY = 43;

  useEffect(() => {
    const dateStr = getLocalDateString();
    const unsubAttendance = subscribeToAttendance(dateStr, (records) => {
      const hadir = records.filter(r => r.status === 'HADIR').length;
      const halangan = records.filter(r => r.status === 'HALANGAN').length;
      const bolos = records.filter(r => r.status === 'TIDAK_SHOLAT').length;
      setStats({ hadir, halangan, bolos, total: records.length });
      setRecent(records.slice(0, 5));
      setLoading(false);
    });

    const unsubLeaderboard = getDailyLeaderboard(setLeaderboard);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      unsubAttendance();
      unsubLeaderboard();
      clearInterval(timer);
    };
  }, []);

  const progress = Math.min((stats.hadir / TARGET_DAILY) * 100, 100);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 120 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 relative">
      {/* Hero Banner Compact */}
      <motion.div variants={itemVariants} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-10 border border-white dark:border-white/5 shadow-xl relative overflow-hidden group transition-colors duration-300">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-wider border dark:border-emerald-800">
              <Sparkles size={10} /> GAS POL!
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
              Halo, <span className="text-emerald-600 dark:text-emerald-400">{userName}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs md:text-sm uppercase tracking-tight">
              Siswa Sholat: <span className="text-slate-900 dark:text-white font-black">{stats.hadir} / {TARGET_DAILY}</span>
            </p>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => changeTab(Tab.SCAN)} 
              className="px-6 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black flex items-center gap-2 text-[10px] tracking-widest shadow-lg mx-auto md:mx-0 uppercase"
            >
              Mulai Scan <ArrowUpRight size={14} />
            </motion.button>
          </div>
          
          {/* Progress Mini */}
          <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
                <circle cx="50%" cy="50%" r="40%" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                <motion.circle 
                    cx="50%" cy="50%" r="40%" stroke="currentColor" strokeWidth="8" fill="transparent" 
                    strokeDasharray="251%" 
                    initial={{ strokeDashoffset: '251%' }}
                    animate={{ strokeDashoffset: `${251 - (251 * progress) / 100}%` }}
                    className="text-emerald-500" strokeLinecap="round"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-xl font-black text-slate-800 dark:text-white">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Grid Utama */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Scan" value={stats.total} icon={<Users size={18} />} color="emerald" />
        <StatCard title="Bolos" value={stats.bolos} icon={<X size={18} />} color="red" />
        <StatCard title="Sholat" value={stats.hadir} icon={<TrendingUp size={18} />} color="indigo" />
        <StatCard title="Halangan" value={stats.halangan} icon={<Activity size={18} />} color="amber" />
      </div>

      {/* Waktu & Aktivitas Compact */}
      <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-[2rem] border border-white dark:border-white/5 shadow-lg flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                <Calendar size={18} />
            </div>
            <div>
                <h4 className="font-black text-slate-800 dark:text-white text-[11px] leading-none">{formatDateFull(currentTime)}</h4>
                <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Status Server: Online</p>
            </div>
        </div>
        <div className="text-emerald-600 dark:text-emerald-400 font-mono text-lg font-black">
            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </motion.div>

      {/* Activity List Compact */}
      <motion.div variants={itemVariants} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] p-6 border border-slate-50 dark:border-white/5 shadow-xl transition-colors duration-300">
        <h3 className="font-black text-slate-900 dark:text-white text-sm mb-4 flex items-center gap-2">
          <Clock size={16} className="text-emerald-500 dark:text-emerald-400" /> Terbaru
        </h3>
        <div className="space-y-3">
          {loading ? (
             <div className="py-10 text-center text-[10px] text-slate-400 font-bold uppercase animate-pulse">Sinkronisasi...</div>
          ) : recent.length === 0 ? (
             <div className="py-10 text-center text-slate-300 dark:text-slate-700 text-[10px] font-black uppercase">Belum ada scan</div>
          ) : (
            recent.map((record) => (
              <motion.div 
                key={record.id} 
                className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:bg-white dark:hover:bg-slate-800 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm ${record.gender === 'L' ? 'bg-blue-600' : 'bg-pink-600'}`}>
                    {record.nama.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-white text-[11px] truncate max-w-[120px]">{record.nama}</h4>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">{record.kelas} • {record.jam}</p>
                  </div>
                </div>
                <div className={`text-[8px] font-black px-3 py-1.5 rounded-lg ${
                    record.status === 'HADIR' ? 'bg-emerald-600 text-white' : 
                    record.status === 'TIDAK_SHOLAT' ? 'bg-red-600 text-white' : 
                    'bg-amber-500 text-white'
                }`}>
                  {record.status === 'HADIR' ? 'SHOLAT' : record.status === 'TIDAK_SHOLAT' ? 'BOLOS' : 'HALANGAN'}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => {
  const colors: any = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
  };
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 border border-slate-100 dark:border-white/5 flex flex-col justify-center shadow-md relative overflow-hidden transition-colors duration-300"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{title}</span>
      <div className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">{value}</div>
    </motion.div>
  );
};

export default DashboardTab;