import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, User, LogOut, Building2 } from 'lucide-react';
import { useAuth } from '../store/AuthStore';
import { todayBS, fiscalYearBS } from '../utils/nepaliDate';

interface TopbarProps { onMenuClick: () => void; }

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userOpen, setUserOpen] = useState(false);

  const today = todayBS();
  const adLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-300 bg-white px-4 sm:px-6">
      <button onClick={onMenuClick} className="btn-ghost lg:hidden"><Menu className="h-6 w-6" /></button>
      <p className="text-sm font-semibold text-slate-800">OfficeBill</p>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-xs font-medium leading-tight text-slate-700">{today.formatted} BS</p>
          <p className="text-[10px] leading-tight text-slate-500">{adLabel} · FY {fiscalYearBS()}</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setUserOpen(o => !o)}
            className="flex items-center gap-2 rounded-sm border border-slate-300 px-2 py-1.5 hover:bg-slate-50"
          >
            <User className="h-4 w-4 text-slate-500" />
            <span className="hidden text-sm font-medium text-slate-800 md:block">{currentUser?.name ?? 'User'}</span>
          </button>
          {userOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setUserOpen(false)} />
              <div className="absolute right-0 z-40 mt-1 w-52 rounded-sm border border-slate-300 bg-white shadow-md">
                <div className="border-b border-slate-200 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-800">{currentUser?.name}</p>
                  <p className="text-xs text-slate-500">{currentUser?.email}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                    {currentUser?.role === 'ADMIN' ? 'Admin' : 'Cashier'}
                  </p>
                </div>
                <button
                  onClick={() => { navigate('/settings'); setUserOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <Building2 className="h-4 w-4" /> Settings
                </button>
                <button
                  onClick={() => { setUserOpen(false); logout(); navigate('/login'); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}