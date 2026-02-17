
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Order, Product, StoreSettings } from '../types';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  XCircle, 
  Zap, 
  Clock, 
  Printer, 
  Utensils, 
  ExternalLink,
  Calendar,
  Filter,
  ChevronDown,
  ChefHat,
  UserRound,
  Tv,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Share2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  orders: Order[];
  products: Product[];
  settings: StoreSettings;
}

const AdminDashboard: React.FC<Props> = ({ orders, products, settings }) => {
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  
  const storeSlug = useMemo(() => {
    const slug = searchParams.get('loja');
    if (slug) return slug;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('loja');
  }, [searchParams]);
  
  const now = new Date();
  const currentMonthValue = now.getMonth() + 1;
  const currentYearValue = now.getFullYear();

  const [filterMonth] = useState<number>(currentMonthValue);
  const [filterDay, setFilterDay] = useState<number>(0); 
  const [filterYear] = useState<number>(currentYearValue);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const matchesYear = orderDate.getFullYear() === filterYear;
      const matchesMonth = (orderDate.getMonth() + 1) === filterMonth;
      const matchesDay = filterDay === 0 || orderDate.getDate() === filterDay;
      return matchesYear && matchesMonth && matchesDay;
    });
  }, [orders, filterMonth, filterDay, filterYear]);

  const totalSales = useMemo(() => filteredOrders
    .filter(o => o.status !== 'CANCELADO' && o.status !== 'PREPARANDO')
    .reduce((acc, o) => acc + (Number(o.total) || 0), 0), [filteredOrders]);
    
  const totalOrdersCount = filteredOrders.filter(o => o.status !== 'CANCELADO').length;
  const canceledOrdersCount = filteredOrders.filter(o => o.status === 'CANCELADO').length;
  
  const salesByProduct = useMemo(() => {
    const map = new Map<string, { name: string, category: string, quantity: number, total: number, isByWeight: boolean }>();
    filteredOrders.filter(o => o.status !== 'CANCELADO').forEach(order => {
        (order.items || []).forEach(item => {
          const productId = item.productId || 'unknown';
          const existing = map.get(productId);
          const qty = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;
          const subtotal = price * qty;
          if (existing) {
            existing.quantity += qty;
            existing.total += subtotal;
          } else {
            const productInfo = products.find(p => p.id === productId);
            map.set(productId, {
              name: item.name || 'Produto sem nome',
              category: productInfo?.category || 'Geral',
              quantity: qty,
              total: subtotal,
              isByWeight: !!item.isByWeight
            });
          }
        });
      });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredOrders, products]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#/cardapio?loja=${storeSlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lojaParam = storeSlug ? `?loja=${storeSlug}` : '';

  return (
    <div className="space-y-8 pb-12 text-zinc-900 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-brand font-bold text-gray-800">Boas-vindas ao Gestor</h1>
           <p className="text-gray-500 text-sm">Controle sua operação em tempo real.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-primary rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-all text-xs">
            <Printer size={16} className="text-secondary" /> Imprimir Relatório
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
            <section className="space-y-3">
                <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Painéis Operacionais</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <OpPanelLink to={`/atendimento${lojaParam}`} label="Atendimento" icon={<UserRound size={24} />} color="bg-orange-50 text-orange-600 border-orange-100" />
                    <OpPanelLink to={`/cozinha${lojaParam}`} label="Cozinha" icon={<ChefHat size={24} />} color="bg-blue-50 text-blue-600 border-blue-100" />
                    <OpPanelLink to={`/tv${lojaParam}`} label="Painel TV" icon={<Tv size={24} />} color="bg-purple-50 text-purple-600 border-purple-100" />
                </div>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon={<TrendingUp className="text-green-500" />} label="Vendas (Mês)" value={`R$ ${totalSales.toFixed(2)}`} color="bg-green-50" />
                <StatCard icon={<ShoppingBag className="text-blue-500" />} label="Pedidos" value={totalOrdersCount.toString()} color="bg-blue-50" />
                <StatCard icon={<XCircle className="text-red-500" />} label="Cancelados" value={canceledOrdersCount.toString()} color="bg-red-50" />
            </div>

            <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <TrendingUp className="text-secondary" /> Faturamento Diário
                </h2>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={generateChartData(filteredOrders)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                            <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                            <Bar dataKey="sales" radius={[10, 10, 10, 10]} barSize={20}>
                                {generateChartData(filteredOrders).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 5 || index === 6 ? '#f68c3e' : '#001F3F'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>
        </div>

        <div className="lg:col-span-4 space-y-8">
            {/* NOVO: Seção de Divulgação e Instalação do App */}
            <section className="bg-primary text-white p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary opacity-20 rounded-full blur-3xl"></div>
                <h2 className="text-xl font-brand font-bold mb-2 flex items-center gap-2">
                    <Smartphone className="text-secondary" /> Seu App na Mão
                </h2>
                <p className="text-white/60 text-xs mb-6 font-medium leading-relaxed">
                    Divulgue seu cardápio para os clientes instalarem o WebApp da sua unidade.
                </p>

                <div className="bg-white p-6 rounded-[2.5rem] flex flex-col items-center mb-6 shadow-2xl">
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 mb-4">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/#/cardapio?loja=${storeSlug}`)}`} 
                          alt="QR Code da Loja"
                          className="w-32 h-32"
                        />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">QR Code para Mesas ou Delivery</p>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={handleCopyLink}
                        className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <Copy size={18} className="text-secondary" />
                            <span className="text-xs font-bold">Copiar Link do App</span>
                        </div>
                        {copied ? <Check size={16} className="text-green-400" /> : <ChevronDown size={16} className="-rotate-90 opacity-20" />}
                    </button>
                    <a 
                      href={`/#/cardapio${lojaParam}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="w-full flex items-center justify-between p-4 bg-secondary text-primary rounded-2xl font-bold transition-all shadow-lg active:scale-95"
                    >
                        <div className="flex items-center gap-3">
                            <ExternalLink size={18} />
                            <span className="text-xs uppercase tracking-wider font-black">Abrir Menu em Nova Aba</span>
                        </div>
                    </a>
                </div>
            </section>

            <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <ShoppingBag className="text-secondary" /> Mais Vendidos
                </h2>
                <div className="space-y-4">
                    {salesByProduct.slice(0, 5).map((prod, idx) => (
                        <div key={idx} className="flex items-center gap-4 group">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center font-black text-gray-400 border border-gray-100 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 truncate text-sm">{prod.name}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400 uppercase font-black">{prod.category}</span>
                                    <span className="text-[10px] text-gray-300">•</span>
                                    <span className="text-[10px] font-bold text-secondary">
                                        {prod.isByWeight ? `${prod.quantity.toFixed(3)}kg` : `${prod.quantity} un`}
                                    </span>
                                </div>
                            </div>
                            <p className="font-bold text-gray-800 text-sm">R$ {prod.total.toFixed(2)}</p>
                        </div>
                    ))}
                    {salesByProduct.length === 0 && (
                        <p className="text-center py-10 text-gray-400 italic text-sm">Nenhuma venda registrada no período.</p>
                    )}
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: any) => (
    <div className={`${color} p-6 rounded-[2.5rem] flex items-center gap-5 border border-white/50 shadow-sm hover:shadow-lg transition-all`}>
        <div className="p-4 bg-white rounded-3xl shadow-sm">{icon}</div>
        <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">{label}</p>
            <p className="text-xl font-black text-gray-800">{value}</p>
        </div>
    </div>
);

const OpPanelLink = ({ to, label, icon, color }: any) => (
    <a href={`#${to}`} target="_blank" rel="noreferrer" className={`p-6 rounded-[2.5rem] flex flex-col items-center gap-3 border transition-all active:scale-95 ${color} shadow-sm hover:shadow-xl group`}>
        <div className="p-3 bg-white rounded-2xl shadow-sm transition-transform group-hover:scale-110">{icon}</div>
        <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </a>
);

const generateChartData = (orders: Order[]) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const data = days.map(d => ({ name: d, sales: 0 }));
    orders.filter(o => o.status !== 'CANCELADO').forEach(o => {
        const day = new Date(o.createdAt).getDay();
        data[day].sales += Number(o.total) || 0;
    });
    // Reorder to start from Monday
    return [...data.slice(1), data[0]];
};

export default AdminDashboard;
