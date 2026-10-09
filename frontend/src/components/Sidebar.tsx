import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Receipt, X, ChevronRight, ChevronsUpDown,
  LayoutDashboard, Users, Package, Tag, ShoppingCart, Wallet, Landmark,
  BarChart3, UsersRound, Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { useAuth } from '../store/AuthStore';
import { canAccess } from '../utils/permissions';

interface SubItem { name: string; path: string; }
interface NavItem { name: string; path?: string; icon: LucideIcon; children?: SubItem[]; }
interface NavSection { label: string; items: NavItem[]; }

// Navigation model (Trimmed for OfficeBill: No Quotations/Returns)
const NAV: NavSection[] = [
  {
    label: 'Business',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Parties', path: '/parties', icon: Users },
      { name: 'Inventory', path: '/inventory', icon: Package },
      {
        name: 'Sales', icon: Tag, children: [
          { name: 'Sales Invoices', path: '/sales/invoices' },
          { name: 'Payment In', path: '/sales/payment-in' },
          { name: 'Dues', path: '/sales/dues' }, // ADDED
        ],
      },
      {
        name: 'Purchase', icon: ShoppingCart, children: [
          { name: 'Purchase', path: '/purchase' },
          { name: 'Payment Out', path: '/purchase/payment-out' },
        ],
      },
      { name: 'Expense', path: '/expense', icon: Wallet },
      { name: 'Manage Accounts', path: '/accounts', icon: Landmark },
    ],
  },
  {
    label: 'Management',
    items: [
      { name: 'Reports', path: '/reports', icon: BarChart3 },
      { name: 'Manage Staffs', path: '/staffs', icon: UsersRound },
    ],
  },
  {
    label: 'Others',
    items: [
      { name: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

const isActivePath = (path: string, pathname: string) =>
  path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/');

interface SidebarProps { isOpen: boolean; onClose: () => void; }

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { state } = useAppStore();
  const { currentUser } = useAuth();
  const role = currentUser?.role ?? 'ADMIN';
  const location = useLocation();

  // Safe fallback while backend data is loading — avoids crash if business is undefined
  const businessName = state?.business?.name ?? 'Loading...';
  const businessPanVat = state?.business?.panVat ?? '—';


  const visibleSections = NAV.map(section => ({
    ...section,
    items: section.items
      .map(item => (item.children
        ? { ...item, children: item.children.filter(c => canAccess(role, c.path)) }
        : item))
      .filter(item => (item.children ? item.children.length > 0 : canAccess(role, item.path ?? '/'))),
  })).filter(s => s.items.length > 0);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV.forEach(s => s.items.forEach(i => {
      if (i.children?.some(c => isActivePath(c.path, location.pathname))) initial[i.name] = true;
    }));
    return initial;
  });
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    setOpenGroups(() => {
      const next: Record<string, boolean> = {};
      NAV.forEach(s => s.items.forEach(i => {
        if (i.children) next[i.name] = i.children.some(c => isActivePath(c.path, location.pathname));
      }));
      return next;
    });
  }, [location.pathname]);

  const toggleGroup = (name: string) =>
    setOpenGroups(o => {
      const opening = !o[name];
      const next: Record<string, boolean> = {};
      Object.keys(o).forEach(k => { next[k] = false; });
      next[name] = opening;
      return next;
    });

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col border-r border-slate-200 bg-white
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:transition-none
        `}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-6 w-6 text-teal-800" />
            <span className="text-lg font-bold text-slate-900">OfficeBill</span>
          </div>
          <button onClick={onClose} className="btn-ghost lg:hidden"><X className="h-5 w-5" /></button>
        </div>

        <div className="relative px-4 pt-3">
          <button
            onClick={() => setSwitcherOpen(o => !o)}
            className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-800 text-sm font-bold text-white">
              {businessName.charAt(0)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{businessName}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
          {switcherOpen && (
            <div className="absolute left-4 right-4 z-50 mt-1 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              <div className="rounded-lg px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-800">{businessName}</p>
                <p className="text-xs text-slate-500">PAN/VAT: {businessPanVat}</p>
              </div>
            </div>
          )}
        </div>

        {currentUser && (
          <div className="px-4 pt-3">
            <p className="rounded-lg bg-teal-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-900">
              {currentUser.name.split(' ')[0]} · {role === 'ADMIN' ? 'Admin' : 'Cashier'}
            </p>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {visibleSections.map(section => (
            <div key={section.label}>
              <p className="px-3 pb-1.5 pt-5 text-xs font-medium text-slate-400">{section.label}</p>
              <ul className="space-y-1">
                {section.items.map(item => {
                  const Icon = item.icon;

                  if (item.children) {
                    const open = !!openGroups[item.name];
                    const childActive = item.children.some(c => isActivePath(c.path, location.pathname));
                    const groupActive = open || childActive;

                    return (
                      <li key={item.name}>
                        <button
                          onClick={() => toggleGroup(item.name)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            groupActive ? 'bg-teal-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <Icon className="h-[18px] w-[18px]" />
                            {item.name}
                          </span>
                          <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
                        </button>
                        {open && (
                          <ul className="mt-1 space-y-0.5">
                            {item.children.map(child => {
                              const needsEnd = item.children!.some(
                                c => c.path !== child.path && c.path.startsWith(child.path + '/')
                              );
                              return (
                                <li key={child.path}>
                                  <NavLink
                                    to={child.path}
                                    end={needsEnd}
                                    onClick={onClose}
                                    className={({ isActive }) =>
                                      `block rounded-lg py-2 pl-10 pr-3 text-sm transition-colors ${
                                        isActive
                                          ? 'bg-slate-200/60 font-medium text-teal-800'
                                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                      }`
                                    }
                                  >
                                    {child.name}
                                  </NavLink>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  }

                  return (
                    <li key={item.name}>
                      <NavLink
                        to={item.path!}
                        end={item.path === '/'}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-teal-800 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`
                        }
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        {item.name}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}