
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardTab from './components/DashboardTab';
import ScannerTab from './components/ScannerTab';
import RekapTab from './components/RekapTab';
import GeneratorTab from './components/GeneratorTab';
import AdminTab from './components/AdminTab';
import { Tab, UserRole } from './types';
import { verifyAdmin, verifyOfficer, registerOfficer } from './services/firebase';
import { ShieldCheck, Rocket, Loader2, Sparkles, Moon, Sun, Info, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [user, setUser] = useState<string | null>(localStorage.getItem('xpray_user'));
  const [role, setRole] = useState<UserRole>(localStorage.getItem('xpray_role') as UserRole || 'OFFICER');
  const [userClass, setUserClass] = useState(localStorage.getItem('xpray_class') || '');
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(localStorage.getItem('theme') === 'dark');
  
  // Notification System
  const [notif, setNotif] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3000);
  };

  const [form, setForm] = useState({ username: '', password: '', kelas: '', mode: 'LOGIN', type: 'OFFICER' });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (form.type === 'SUPER_ADMIN') {
        const ok = await verifyAdmin(form.username, form.password);
        if (ok) {
          loginSuccess(form.username, '', 'SUPER_ADMIN');
          showToast("Selamat datang Admin!", "success");
        } else {
          showToast("Akses ditolak! Cek kembali password.", "error");
        }
      } else {
        if (form.mode === 'REGISTER') {
          if (!form.kelas) return showToast("Pilih kelas terlebih dahulu.", "info");
          await registerOfficer(form.username, form.password, form.kelas.toUpperCase());
          showToast("Daftar berhasil! Silakan masuk.", "success");
          setForm({ ...form, mode: 'LOGIN' });
        } else {
          const data = await verifyOfficer(form.username, form.password);
          if (data) {
            loginSuccess(data.username, data.kelas, 'OFFICER');
            showToast(`Halo Petugas ${data.username}!`, "success");
          } else {
            showToast("Username atau Password salah!", "error");
          }
        }
      }
    } catch (err: any) { 
      showToast(err.message || "Terjadi kesalahan sistem.", "error"); 
    }
    finally { setLoading(false); }
  };

  const loginSuccess = (u: string, c: string, r: UserRole) => {
    localStorage.setItem('xpray_user', u);
    localStorage.setItem('xpray_class', c);
    localStorage.setItem('xpray_role', r);
    setUser(u); setUserClass(c); setRole(r);
  };

  const logout = () => { 
    localStorage.clear(); 
    showToast("Berhasil keluar.", "info");
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="min-h-screen">
      {/* Global Toast Notification */}
      <AnimatePresence>
        {notif && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] w-[90%] max-w-sm"
          >
            <div className={`glass-card p-4 rounded-2xl shadow-2xl border flex items-center gap-4 ${
              notif.type === 'success' ? 'border-emerald-500/50 bg-emerald-500/10' : 
              notif.type === 'error' ? 'border-rose-500/50 bg-rose-500/10' : 
              'border-blue-500/50 bg-blue-500/10'
            }`}>
              <div className={`p-2 rounded-xl ${
                notif.type === 'success' ? 'bg-emerald-500 text-white' : 
                notif.type === 'error' ? 'bg-rose-500 text-white' : 
                'bg-blue-500 text-white'
              }`}>
                {notif.type === 'success' && <CheckCircle2 size={18} />}
                {notif.type === 'error' && <XCircle size={18} />}
                {notif.type === 'info' && <AlertCircle size={18} />}
              </div>
              <p className={`text-[11px] font-black uppercase tracking-wider ${
                notif.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 
                notif.type === 'error' ? 'text-rose-700 dark:text-rose-400' : 
                'text-blue-700 dark:text-blue-400'
              }`}>
                {notif.msg}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!user ? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full -ml-48 -mb-48"></div>

          <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} className="w-full max-w-md glass-card rounded-[4rem] p-10 md:p-12 shadow-2xl relative overflow-hidden border border-white/20">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 rotate-6 shadow-2xl shadow-emerald-600/30">
                <ShieldCheck className="text-white w-10 h-10" strokeWidth={2.5} />
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none mb-1">X-PRAY</h1>
              <p className="text-[10px] font-black text-slate-500 tracking-[0.4em] uppercase">Attendance System</p>
            </div>

            <div className="flex bg-slate-200 dark:bg-slate-800/50 p-1.5 rounded-[2rem] mb-8 border border-slate-300 dark:border-slate-700">
              <button onClick={() => setForm({...form, type: 'OFFICER'})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-widest transition-all ${form.type === 'OFFICER' ? 'bg-white dark:bg-slate-700 shadow-xl text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>PETUGAS</button>
              <button onClick={() => setForm({...form, type: 'SUPER_ADMIN'})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-widest transition-all ${form.type === 'SUPER_ADMIN' ? 'bg-white dark:bg-slate-700 shadow-xl text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>ADMIN</button>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-4">
                <input type="text" placeholder="Username" required value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full px-8 py-5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-3xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-900 dark:text-white transition-all shadow-sm" />
                <input type="password" placeholder="Password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-8 py-5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-3xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-900 dark:text-white transition-all shadow-sm" />
                
                {form.mode === 'REGISTER' && form.type === 'OFFICER' && (
                  <input type="text" placeholder="Kelas (Contoh: X.1)" required value={form.kelas} onChange={e => setForm({...form, kelas: e.target.value})} className="w-full px-8 py-5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-3xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-black uppercase text-slate-900 dark:text-white transition-all shadow-sm" />
                )}
              </div>
              
              <button disabled={loading} className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-[2rem] shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 mt-4">
                {loading ? <Loader2 className="animate-spin" /> : <Rocket size={22} />}
                <span className="text-[11px] uppercase tracking-widest">{form.mode === 'LOGIN' ? 'Masuk Sekarang' : 'Daftar Akun'}</span>
              </button>
            </form>

            {form.type === 'OFFICER' && (
              <button onClick={() => setForm({...form, mode: form.mode === 'LOGIN' ? 'REGISTER' : 'LOGIN'})} className="w-full mt-10 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-emerald-500 transition-colors">
                {form.mode === 'LOGIN' ? 'Buat Akun Petugas Baru' : 'Sudah Punya Akun? Masuk'}
              </button>
            )}

            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 flex items-center justify-center gap-4">
              <button onClick={() => setIsDark(!isDark)} className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-amber-400">
                 {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <Info size={14} /> v2.6 Pro
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <>
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} role={role} theme={isDark ? 'dark' : 'light'} toggleTheme={() => setIsDark(!isDark)} onLogout={logout} user={user} userClass={userClass} />
          
          <main className="container mx-auto max-w-lg pt-24 pb-32">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{opacity:0, y:15}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-15}} transition={{duration: 0.3, ease: 'easeOut'}}>
                {activeTab === Tab.DASHBOARD && <DashboardTab changeTab={setActiveTab} userName={user} />}
                {activeTab === Tab.SCAN && <ScannerTab currentUser={user} officerClass={userClass} showToast={showToast} />}
                {activeTab === Tab.REKAP && <RekapTab />}
                {activeTab === Tab.GENERATOR && <GeneratorTab />}
                {activeTab === Tab.ADMIN && <AdminTab currentAdmin={user} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </>
      )}
    </div>
  );
};

export default App;
