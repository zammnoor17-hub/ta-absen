
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GeneratorTab from './components/GeneratorTab';
import ScannerTab from './components/ScannerTab';
import RekapTab from './components/RekapTab';
import DashboardTab from './components/DashboardTab';
import AdminTab from './components/AdminTab';
import { Tab, UserRole, AttendanceRecord } from './types';
import { ShieldCheck, MessageCircle, Sparkles, Zap, Rocket } from 'lucide-react';
import { verifyAdmin, verifyOfficer, registerOfficer, subscribeToAttendance, getLocalDateString } from './services/firebase';
import { motion, AnimatePresence } from 'framer-motion';

const LiveActivityTicker: React.FC = () => {
  const [lastRecord, setLastRecord] = useState<AttendanceRecord | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dateStr = getLocalDateString();
    let initialLoad = true;
    const unsub = subscribeToAttendance(dateStr, (records) => {
      if (records.length > 0 && !initialLoad) {
        setLastRecord(records[0]);
        setShow(true);
        const timer = setTimeout(() => setShow(false), 5000);
        return () => clearTimeout(timer);
      }
      initialLoad = false;
    });
    return () => unsub();
  }, []);

  return (
    <AnimatePresence>
      {show && lastRecord && (
        <motion.div 
          initial={{ y: -100, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.8 }}
          className="fixed top-20 right-4 z-[200] w-[280px]"
        >
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl text-slate-900 dark:text-white p-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-slate-100 dark:border-white/10 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${lastRecord.gender === 'L' ? 'bg-blue-600' : 'bg-pink-600'}`}>
              <Zap size={20} className="text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={10} /> TERDETEKSI!
              </p>
              <h4 className="font-bold text-sm truncate">{lastRecord.nama}</h4>
              <p className="text-[9px] text-slate-400 truncate tracking-tight uppercase">Kelas: {lastRecord.kelas}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [user, setUser] = useState<string | null>(localStorage.getItem('xpray_user'));
  const [userClass, setUserClass] = useState<string | null>(localStorage.getItem('xpray_class'));
  const [role, setRole] = useState<UserRole>((localStorage.getItem('xpray_role') as UserRole) || 'OFFICER');
  const [theme, setTheme] = useState<'light' | 'dark'>( (localStorage.getItem('xpray_theme') as 'light' | 'dark') || 'light' );
  
  const [loginMode, setLoginMode] = useState<UserRole>('OFFICER');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    username: '',
    password: '',
    kelas: ''
  });

  const WHATSAPP_URL = "https://wa.me/6285185957828?text=Halo%20Admin%20X-Pray,%20saya%20ingin%20melaporkan%20masalah...";

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('xpray_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (loginMode === 'SUPER_ADMIN') {
        const isValid = await verifyAdmin(form.username, form.password);
        if (isValid) {
          saveSession(form.username, '', 'SUPER_ADMIN');
          setActiveTab(Tab.ADMIN);
        } else {
          alert("Gagal Login: Username/Password salah atau Database Rules terkunci.");
        }
      } else {
        if (isRegister) {
          if (!form.kelas) {
             alert("Mohon isi kelas Anda!");
             setLoading(false);
             return;
          }
          await registerOfficer(form.username, form.password, form.kelas.toUpperCase());
          alert("Pendaftaran berhasil! Silakan login.");
          setIsRegister(false);
        } else {
          const result = await verifyOfficer(form.username, form.password);
          if (result) {
            saveSession(result.username, result.kelas, 'OFFICER');
          } else {
            alert("Username atau Password salah!");
          }
        }
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan koneksi database.");
    } finally {
      setLoading(false);
    }
  };

  const saveSession = (u: string, c: string, r: UserRole) => {
    localStorage.setItem('xpray_user', u);
    localStorage.setItem('xpray_class', c);
    localStorage.setItem('xpray_role', r);
    setUser(u);
    setUserClass(c);
    setRole(r);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setUserClass(null);
    setRole('OFFICER');
    setActiveTab(Tab.DASHBOARD);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-[400px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[3rem] p-8 shadow-2xl border border-white dark:border-white/10 relative z-10"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-xl rotate-6 mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">X-PRAY</h1>
            <p className="text-slate-400 dark:text-slate-500 font-bold text-[9px] uppercase tracking-[0.2em] mt-1">FOTA PROJECT</p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-6">
            <button 
              type="button"
              onClick={() => { setLoginMode('OFFICER'); setIsRegister(false); }} 
              className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${loginMode === 'OFFICER' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
            >
              PETUGAS
            </button>
            <button 
              type="button"
              onClick={() => { setLoginMode('SUPER_ADMIN'); setIsRegister(false); }} 
              className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${loginMode === 'SUPER_ADMIN' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
            >
              ADMIN
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-4">
              <input type="text" required value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} placeholder="Username" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white font-bold text-sm" />
              <input type="password" required value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="Password" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white font-bold text-sm" />

              <AnimatePresence>
                {loginMode === 'OFFICER' && isRegister && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <input type="text" required value={form.kelas} onChange={(e) => setForm({...form, kelas: e.target.value})} placeholder="Kelas (Contoh: X.4)" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-black uppercase text-sm dark:text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 dark:bg-emerald-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-4">
              {loading ? <Sparkles className="animate-spin" /> : <Rocket size={18} />}
              <span className="text-[10px] tracking-widest uppercase">{isRegister ? 'Daftar Sekarang' : 'Masuk'}</span>
            </button>
          </form>

          {loginMode === 'OFFICER' && (
            <div className="mt-6 text-center">
              <button 
                type="button"
                onClick={() => setIsRegister(!isRegister)} 
                className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                {isRegister ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Buat Akun Baru'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <LiveActivityTicker />
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        role={role} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        user={user || ''}
        userClass={userClass || ''}
        onLogout={handleLogout}
      />
      
      <main className="container mx-auto px-4 pt-20 md:pt-6 pb-28 md:pb-12 max-w-5xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === Tab.DASHBOARD && <DashboardTab changeTab={setActiveTab} userName={user || 'Officer'} />}
            {activeTab === Tab.GENERATOR && <GeneratorTab />}
            {activeTab === Tab.SCAN && <ScannerTab currentUser={user || ''} officerClass={userClass || ''} />}
            {activeTab === Tab.REKAP && <RekapTab />}
            {activeTab === Tab.ADMIN && <AdminTab currentAdmin={user || ''} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <motion.a 
        href={WHATSAPP_URL} 
        target="_blank" 
        rel="noopener noreferrer" 
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[50] w-14 h-14 bg-emerald-600 dark:bg-emerald-500 text-white rounded-2xl shadow-2xl flex items-center justify-center"
      >
         <MessageCircle className="w-7 h-7" />
         <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
      </motion.a>
    </div>
  );
};

export default App;
