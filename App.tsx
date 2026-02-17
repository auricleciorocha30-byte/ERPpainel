
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Settings, 
  PlusCircle, 
  LogOut,
  Loader2,
  UserRound,
  ExternalLink,
  Utensils,
  Tv,
  Users,
  Zap,
  ChefHat,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  ShieldAlert
} from 'lucide-react';
import { supabase } from './lib/supabase.ts';
import { Product, Order, StoreSettings, Waitstaff, OrderStatus, StoreProfile } from './types.ts';
import { INITIAL_SETTINGS } from './constants.ts';

// Pages
import AdminDashboard from './pages/AdminDashboard.tsx';
import MenuManagement from './pages/MenuManagement.tsx';
import OrdersList from './pages/OrdersList.tsx';
import StoreSettingsPage from './pages/StoreSettingsPage.tsx';
import DigitalMenu from './pages/DigitalMenu.tsx';
import TVBoard from './pages/TVBoard.tsx';
import AttendantPanel from './pages/AttendantPanel.tsx';
import LoginPage from './pages/LoginPage.tsx';
import WaitstaffManagement from './pages/WaitstaffManagement.tsx';
import KitchenBoard from './pages/KitchenBoard.tsx';
import SuperAdminPanel from './pages/SuperAdminPanel.tsx';

const SOUNDS = {
  NEW_ORDER: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
  ORDER_READY: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'
};

const SESSION_KEY = 'gc-conveniencia-session-v1';

export default function App() {
  return (
    <HashRouter>
      <StoreContext />
    </HashRouter>
  );
}

function StoreContext() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  const storeSlug = useMemo(() => {
    const slug = searchParams.get('loja');
    if (slug) return slug;
    const urlParams = new URLSearchParams(window.location.search);
    const mainSlug = urlParams.get('loja');
    if (mainSlug) return mainSlug;
    const hashPart = window.location.hash.split('?')[1];
    if (hashPart) {
        const hashParams = new URLSearchParams(hashPart);
        return hashParams.get('loja');
    }
    return null;
  }, [searchParams, location]);
  
  const [currentStore, setCurrentStore] = useState<StoreProfile | null>(null);
  const [loadingStore, setLoadingStore] = useState(!!storeSlug);
  const [storeError, setStoreError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [categories, setCategories] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [adminUser, setAdminUser] = useState<Waitstaff | null>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTable, setActiveTable] = useState<string | null>(null);
  const initialLoadRef = useRef(true);
  const ordersRef = useRef<Order[]>([]);

  const handleSetUser = (user: Waitstaff | null) => {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    setAdminUser(user);
  };

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    audio.play().catch(e => console.warn('Som bloqueado pelo navegador:', e));
  };

  const applyColors = useCallback((s: StoreSettings) => {
    document.documentElement.style.setProperty('--primary-color', s.primaryColor || '#001F3F');
    document.documentElement.style.setProperty('--secondary-color', s.secondaryColor || '#FFD700');
  }, []);

  useEffect(() => {
    if (storeSlug) {
      fetchStoreContext(storeSlug);
    } else {
      setLoadingStore(false);
      document.documentElement.style.setProperty('--primary-color', '#001F3F');
      document.documentElement.style.setProperty('--secondary-color', '#FFD700');
    }
  }, [storeSlug]);

  const fetchStoreContext = async (slug: string) => {
    setLoadingStore(true);
    try {
      const { data, error } = await supabase
        .from('store_profiles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        setStoreError('Loja não encontrada.');
      } else if (!data.isActive && data.isactive !== true) {
        setStoreError('Esta conta está temporariamente suspensa.');
      } else {
        const storeData = data as any;
        const settingsRaw = storeData.settings;
        const parsedSettings = typeof settingsRaw === 'string' ? JSON.parse(settingsRaw) : settingsRaw;
        
        setCurrentStore({ 
          ...storeData, 
          isActive: storeData.isActive ?? storeData.isactive ?? true,
          settings: parsedSettings 
        });
        setSettings(parsedSettings);
        applyColors(parsedSettings);
      }
    } catch (err) {
      setStoreError('Erro ao carregar loja.');
    } finally {
      setLoadingStore(false);
    }
  };

  const mapOrderFromDb = (dbOrder: any): Order => ({
    id: dbOrder.id.toString(),
    type: dbOrder.type,
    items: typeof dbOrder.items === 'string' ? JSON.parse(dbOrder.items) : dbOrder.items,
    status: dbOrder.status,
    total: Number(dbOrder.total),
    createdAt: Number(dbOrder.createdAt || dbOrder.createdat || dbOrder.created_at || Date.now()),
    tableNumber: dbOrder.tableNumber || dbOrder.tablenumber || dbOrder.table_number,
    customerName: dbOrder.customerName || dbOrder.customername || dbOrder.customer_name,
    customerPhone: dbOrder.customerPhone || dbOrder.customerphone || dbOrder.customer_phone,
    deliveryAddress: dbOrder.deliveryAddress || dbOrder.deliveryaddress || dbOrder.delivery_address,
    paymentMethod: dbOrder.paymentMethod || dbOrder.paymentmethod || dbOrder.payment_method,
    notes: dbOrder.notes,
    changeFor: Number(dbOrder.changeFor || dbOrder.changefor || dbOrder.change_for || 0),
    waitstaffName: dbOrder.waitstaffName || dbOrder.waitstaffname || dbOrder.waitstaff_name,
    couponApplied: dbOrder.couponApplied || dbOrder.couponapplied || dbOrder.coupon_applied,
    discountAmount: Number(dbOrder.discountAmount || dbOrder.discountamount || dbOrder.discount_amount || 0),
    isSynced: true
  });

  const mapProductFromDb = (p: any): Product => ({
    id: p.id.toString(),
    name: p.name,
    description: p.description || '',
    price: Number(p.price),
    category: p.category,
    imageUrl: p.imageUrl || p.imageurl || p.image_url || '',
    isActive: p.isActive ?? p.isactive ?? p.is_active ?? true,
    featuredDay: p.featuredDay ?? p.featuredday ?? p.featured_day,
    isByWeight: p.isByWeight ?? p.isbyweight ?? p.is_by_weight ?? false
  });

  useEffect(() => {
    if (!currentStore) return;

    const syncOrders = async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('store_id', currentStore.id)
          .order('id', { ascending: false })
          .limit(100);

        if (data) {
          const newOrders = data.map(mapOrderFromDb);
          if (!initialLoadRef.current) {
            if (newOrders.length > ordersRef.current.length) playAudio(SOUNDS.NEW_ORDER);
            newOrders.forEach(no => {
              const old = ordersRef.current.find(oo => oo.id === no.id);
              if (old && old.status !== 'PRONTO' && no.status === 'PRONTO') playAudio(SOUNDS.ORDER_READY);
            });
          }
          ordersRef.current = newOrders;
          setOrders(newOrders);
          initialLoadRef.current = false;
        }
      } catch (err) { console.warn('Erro Sync Neon'); }
    };

    const fetchMetadata = async () => {
      const [pRes, cRes] = await Promise.all([
        supabase.from('products').select('*').eq('store_id', currentStore.id),
        supabase.from('categories').select('*').eq('store_id', currentStore.id)
      ]);
      if (pRes.data) setProducts(pRes.data.map(mapProductFromDb));
      if (cRes.data) setCategories(cRes.data.map((c: any) => c.name));
    };

    fetchMetadata();
    syncOrders();
    const interval = setInterval(syncOrders, 10000);
    return () => clearInterval(interval);
  }, [currentStore]);

  const addOrder = async (order: Order) => {
    const dbOrder = {
      store_id: currentStore?.id,
      type: order.type,
      items: JSON.stringify(order.items),
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
      notes: order.notes,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      waitstaffName: order.waitstaffName,
      changeFor: order.changeFor,
      couponApplied: order.couponApplied,
      discountAmount: order.discountAmount
    };
    await supabase.from('orders').insert([dbOrder]);
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    await supabase.from('orders').eq('id', id).update({ status });
  };

  const handleUpdateSettings = async (newSettings: StoreSettings) => {
    if (currentStore) {
      await supabase.from('store_profiles').eq('id', currentStore.id).update({ settings: JSON.stringify(newSettings) });
      setCurrentStore({ ...currentStore, settings: newSettings });
    }
    setSettings(newSettings);
    applyColors(newSettings);
  };

  if (loadingStore) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-secondary" size={48} /></div>;

  if (storeError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm space-y-6">
           <ShieldAlert size={64} className="mx-auto text-red-500" />
           <h1 className="text-2xl font-brand font-bold text-slate-800">Acesso Restrito</h1>
           <p className="text-slate-400 font-medium leading-relaxed">{storeError}</p>
           <button onClick={() => window.location.href = window.location.origin} className="w-full py-4 bg-primary text-white rounded-2xl font-bold">Voltar ao Início</button>
        </div>
      </div>
    );
  }

  const lojaParam = storeSlug ? `?loja=${storeSlug}` : '';

  return (
    <Routes>
      {/* Rotas Operacionais Independentes com prioridade máxima */}
      <Route path="/atendimento" element={<AttendantPanel adminUser={adminUser} orders={orders} settings={settings} onSelectTable={setActiveTable} updateStatus={updateOrderStatus} onLogout={() => handleSetUser(null)} />} />
      <Route path="/cozinha" element={<KitchenBoard orders={orders} updateStatus={updateOrderStatus} />} />
      <Route path="/tv" element={<TVBoard orders={orders} settings={settings} products={products} />} />
      <Route path="/cardapio" element={<DigitalMenu products={products} categories={categories} settings={settings} orders={orders} addOrder={addOrder} tableNumber={activeTable} onLogout={() => setActiveTable(null)} isWaitstaff={!!adminUser} />} />
      
      {/* Rotas de Identidade e Master */}
      <Route path="/master" element={<SuperAdminPanel />} />
      <Route path="/login" element={adminUser ? (adminUser.role === 'GERENTE' ? <Navigate to={`/${lojaParam}`} /> : <Navigate to={`/atendimento${lojaParam}`} />) : <LoginPage onLoginSuccess={handleSetUser} />} />

      {/* Rota Raiz (Painel Admin) */}
      <Route path="/" element={
        !storeSlug ? <SuperAdminPanel /> : (
          adminUser ? (
            adminUser.role === 'GERENTE' ? 
              <AdminLayout settings={settings} onLogout={() => handleSetUser(null)} /> : 
              <Navigate to={`/atendimento${lojaParam}`} />
          ) : <Navigate to={`/login${lojaParam}`} />
        )
      }>
        <Route index element={<AdminDashboard orders={orders} products={products} settings={settings} />} />
        <Route path="cardapio-admin" element={<MenuManagement products={products} saveProduct={async (p) => { 
          await supabase.from('products').upsert([{ ...p, store_id: currentStore?.id }]);
        }} deleteProduct={async (id) => {
          await supabase.from('products').eq('id', id).delete();
        }} categories={categories} setCategories={setCategories} />} />
        <Route path="pedidos" element={<OrdersList orders={orders} updateStatus={updateOrderStatus} products={products} addOrder={addOrder} settings={settings} />} />
        <Route path="equipe" element={<WaitstaffManagement currentStore={currentStore!} settings={settings} onUpdateSettings={handleUpdateSettings} />} />
        <Route path="configuracoes" element={<StoreSettingsPage settings={settings} products={products} onSave={handleUpdateSettings} />} />
      </Route>

      <Route path="*" element={<Navigate to={storeSlug ? `/cardapio${lojaParam}` : "/"} />} />
    </Routes>
  );
}

function AdminLayout({ settings, onLogout }: { settings: StoreSettings, onLogout: () => void }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Detecção robusta para o slug nos atalhos
  const storeSlug = useMemo(() => {
    const slug = searchParams.get('loja');
    if (slug) return slug;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('loja');
  }, [searchParams]);

  const lojaParam = storeSlug ? `?loja=${storeSlug}` : '';

  const menuItems = [
    { to: `/${lojaParam}`, label: 'Início', icon: <LayoutDashboard size={20} /> },
    { to: `/pedidos${lojaParam}`, label: 'Pedidos', icon: <ShoppingCart size={20} /> },
    { to: `/cardapio-admin${lojaParam}`, label: 'Menu', icon: <PlusCircle size={20} /> },
    { to: `/equipe${lojaParam}`, label: 'Time', icon: <Users size={20} /> },
    { to: `/configuracoes${lojaParam}`, label: 'Ajustes', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 pb-20 md:pb-0 text-zinc-900">
      <aside className="w-64 bg-primary text-white hidden md:flex flex-col border-r border-black/10">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <img src={settings.logoUrl} className="w-10 h-10 rounded-full border-2 border-secondary object-cover" alt="Logo" />
          <span className="font-brand text-lg font-bold truncate">{settings.storeName}</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map(item => (
            <Link key={item.to} to={item.to} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${location.pathname + location.search === item.to ? 'bg-secondary' : 'hover:bg-white/5'}`}>
              {item.icon} {item.label}
            </Link>
          ))}
          <div className="pt-6 pb-2 px-3 text-[10px] text-white/40 font-bold uppercase tracking-widest">Atalhos Externos</div>
          {/* Garantido o prefixo #/ para rotas de hash em novas abas */}
          <a href={`#/atendimento${lojaParam}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-orange-400 font-bold"><UserRound size={20} /> Atendimento</a>
          <a href={`#/cardapio${lojaParam}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-secondary"><Utensils size={20} /> Cardápio</a>
          <a href={`#/cozinha${lojaParam}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-300"><ChefHat size={20} /> Cozinha</a>
          <a href={`#/tv${lojaParam}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-300"><Tv size={20} /> Painel TV</a>
        </nav>
        <div className="p-4 border-t border-white/10"><button onClick={onLogout} className="w-full flex items-center gap-3 p-3 text-red-400 font-bold"><LogOut size={18} /> Sair</button></div>
      </aside>
      <main className="flex-1 overflow-auto md:p-8 p-4 bg-gray-50"><Outlet /></main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t h-20 md:hidden flex items-center justify-around z-50">
        {menuItems.map(item => (
          <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-1 flex-1 ${location.pathname + location.search === item.to ? 'text-secondary' : 'text-gray-400'}`}>{item.icon}<span className="text-[9px] font-bold uppercase">{item.label}</span></Link>
        ))}
      </nav>
    </div>
  );
}
