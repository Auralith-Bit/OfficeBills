import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Parties from './pages/Parties';
import Inventory from './pages/Inventory';
import Invoices from './pages/Invoices';
import InvoiceCreate from './pages/InvoiceCreate';
import InvoiceView from './pages/InvoiceView';
import Dues from './pages/Dues';
import PaymentIn from './pages/PaymentIn';
import Pos from './pages/Pos';
import Purchase from './pages/Purchase';
import PaymentOut from './pages/PaymentOut';
import Expense from './pages/Expense';
import Accounts from './pages/Accounts';
import Reports from './pages/Reports';
import Staffs from './pages/Staffs';
import Signup from './pages/Signup';
import SignupVerify from './pages/SignUpVerify';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import { AuthStoreProvider, useAuth } from './store/AuthStore';
import { AppStoreProvider, useAppStore } from './store/AppStore';
import { canAccess, ROLE_HOME } from './utils/permissions';

function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Block routes the signed-in role may not open */
function RequireRole({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const role = currentUser?.role;
  if (role && !canAccess(role, location.pathname)) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }
  return <>{children}</>;
}

/** Landing: send each role to its home screen; Admin stays on Dashboard */
function RoleHome() {
  const { currentUser } = useAuth();
  const role = currentUser?.role ?? 'ADMIN';
  if (role !== 'ADMIN' && ROLE_HOME[role] !== '/') return <Navigate to={ROLE_HOME[role]} replace />;
  return <Dashboard />;
}

function BusinessSync() {
  const { currentVendor } = useAuth();
  const { actions } = useAppStore();
  useEffect(() => {
    if (currentVendor) {
      actions.setBusiness({
        name: currentVendor.businessName,
        registrationType: currentVendor.registrationType || 'PAN',
        panVat: currentVendor.panVat || '123456789',
        address: currentVendor.address || '',
        phone: currentVendor.phone || '',
      });
    }
  }, [currentVendor?.id]);
  return null;
}

function App() {
  return (
    <AuthStoreProvider>
      <AppStoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
            <Route path="/verify-otp" element={<GuestOnly><SignupVerify /></GuestOnly>} />
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />

            <Route path="/" element={<RequireAuth><RequireRole><BusinessSync /><Layout /></RequireRole></RequireAuth>}>
              <Route index element={<RoleHome />} />
              <Route path="pos" element={<Pos />} />
              <Route path="parties" element={<Parties />} />
              <Route path="inventory" element={<Inventory />} />

              <Route path="sales/invoices" element={<Invoices />} />
              <Route path="sales/invoices/new" element={<InvoiceCreate />} />
              <Route path="sales/invoices/:editId/edit" element={<InvoiceCreate />} />
              <Route path="sales/invoices/:id" element={<InvoiceView />} />
              <Route path="sales/payment-in" element={<PaymentIn />} />
              <Route path="sales/dues" element={<Dues />} /> {/* ADDED */}

              <Route path="purchase" element={<Purchase />} />
              <Route path="purchase/payment-out" element={<PaymentOut />} />

              <Route path="expense" element={<Expense />} />
              <Route path="accounts" element={<Accounts />} />

              <Route path="reports" element={<Reports />} />
              <Route path="staffs" element={<Staffs />} />

              <Route path="settings" element={<Settings />} />

              <Route path="invoices" element={<Navigate to="/sales/invoices" replace />} />
              <Route path="invoices/new" element={<Navigate to="/sales/invoices/new" replace />} />
              <Route path="items" element={<Navigate to="/inventory" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppStoreProvider>
    </AuthStoreProvider>
  );
}

export default App;