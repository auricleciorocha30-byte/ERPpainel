
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
  Tv
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  orders: Order[];
  products: Product[];
  settings: StoreSettings;
}

const AdminDashboard: React.FC<Props> = ({ orders, products, settings }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [searchParams] = useSearchParams();
  const storeSlug = searchParams.get('loja');
  
  // Estados para Filtros
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1);
  const [filterDay, setFilterDay] = useState<number>(0); 
  const [filterYear] = useState<number>(now.getFullYear());

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

    filteredOrders
      .filter(o => o.status !== 'CANCELADO')
      .forEach(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach(item => {
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

  const handlePrintReport = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const chartData = [
    { name: 'Seg', sales: 400 },
    { name: 'Ter', sales: 300 },
    { name: 'Qua', sales: 600 },
    { name: 'Qui', sales: 800 },
    { name: 'Sex', sales: 500 },
    { name: 'Sáb', sales: 900 },
    { name: 'Dom', sales: 700 },
  ];

  const menuUrl = storeSlug ? `/#/cardapio?loja=${storeSlug}` : '#/cardapio';

  return (
    <div className="space-y-8 pb-12 text-zinc-900 animate-fade-in">
      <style>{`
        @media print {
          @page { margin: 0; }
          html, body { margin: 0; padding: 0; background: #fff !important; }
          body * { visibility: hidden; }
          #sales-report-print, #sales-report-print * { visibility: visible; }
          #sales-report-print {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
            background: #fff;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-brand font-bold text-gray-800">Boas-vindas ao Gestor</h1>
           <p className="text-gray-500 text-sm">Controle sua operação em tempo real.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handlePrintReport} className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-primary rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-all text-xs">
            <Printer size={16} className="text-secondary" /> Imprimir Relatório
          </button>
          <a href={menuUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold shadow-xl hover:opacity-90 transition-all text-xs">
            <Utensils size={16} /> Ver Cardápio Público <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* NOVO: Atalhos Operacionais para Mobile/Desktop */}
      <section className="space-y-3">
        <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Atalhos da Equipe (Nova Guia)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <OpPanelLink 
            to={`#/atendimento?loja=${storeSlug}`} 
            label="Painel Atendente" 
            icon={<UserRound size={24} />} 
            color="bg-orange-50 text-orange-600 border-orange-100" 
          />
          <OpPanelLink 
            to={`#/cozinha?loja=${storeSlug}`} 
            label="Painel Cozinha" 
            icon={<ChefHat size={24} />} 
            color="bg-blue-50 text-blue-600 border-blue-100" 
          />
          <OpPanelLink 
            to={`#/tv?loja=${storeSlug}`} 
            label="Painel TV" 
            icon={<Tv size={24} />} 
            color="bg-purple-50 text-purple-600 border-purple-100" 
          />
        </div>
      </section>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest flex items-center gap-1">
            <Calendar size={12} /> Filtro Mês
          </label>
          <div className="relative">
            <select 
              value={filterMonth} 
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-secondary/20 transition-all"
            >
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest flex items-center gap-1">
            <Filter size={12} /> Filtro Dia
          </label>
          <div className="relative">
            <select 
              value={filterDay} 
              onChange={(e) => setFilterDay(Number(e.target.value))}
              className="appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-secondary/20 transition-all"
            >
              <option value={0}>Todos os dias</option>
              {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Faturamento" value={`R$ ${totalSales.toFixed(2)}`} icon={<DollarSign className="text-green-600" />} color="bg-green-50" />
        <StatCard title="Pedidos" value={totalOrdersCount.toString()} icon={<ShoppingBag className="text-orange-600" />} color="bg-orange-50" />
        <StatCard title="Cancelados" value={canceledOrdersCount.toString()} icon={<XCircle className="text-red-600" />} color="bg-red-50" />
        <StatCard title="Média Ticket" value={`R$ ${(totalSales / (totalOrdersCount || 1)).toFixed(2)}`} icon={<Zap className="text-blue-600" />} color="bg-blue-50" />
        <StatCard title="Filtrados" value={filteredOrders.length.toString()} icon={<Clock className="text-purple-600" />} color="bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
          <h2 className="text-lg font-bold text-gray-800 mb-8">Performance Semanal</h2>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                <Bar dataKey="sales" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 5 ? 'var(--secondary-color)' : '#e5e7eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary p-8 rounded-[2.5rem] shadow-2xl text-white">
            <TrendingUp className="text-secondary mb-4" size={32} />
            <h3 className="text-xl font-bold mb-4">Top 3 Vendidos</h3>
            <div className="space-y-4">
              {salesByProduct.slice(0, 3).map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                  <p className="font-bold truncate text-white">{item.name}</p>
                  <span className="font-bold text-secondary">R$ {item.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-bold text-gray-800">Produtos Vendidos</h2>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-4 px-4 text-[10px] font-black uppercase text-gray-400">Produto</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase text-gray-400 text-center">Quantidade</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase text-gray-400 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {salesByProduct.length > 0 ? salesByProduct.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="py-4 px-4 font-bold text-sm text-gray-800">{item.name}</td>
                  <td className="py-4 px-4 text-center text-sm text-gray-600">{item.isByWeight ? `${item.quantity.toFixed(3)}kg` : `${item.quantity} un`}</td>
                  <td className="py-4 px-4 text-right font-bold text-primary">R$ {item.total.toFixed(2)}</td>
                </tr>
              )) : <tr><td colSpan={3} className="py-12 text-center text-gray-400">Nenhuma venda encontrada no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div id="sales-report-print" className="hidden">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28pt', fontWeight: 'bold', marginBottom: '5px' }}>{settings.storeName.toUpperCase()}</h1>
          {settings.address && <p style={{ fontSize: '11pt', margin: '2px 0' }}>{settings.address}</p>}
          <div style={{ borderBottom: '3px solid black', margin: '20px 0' }}></div>
          <h2 style={{ fontSize: '18pt', fontWeight: 'bold' }}>RELATÓRIO DE VENDAS POR PERÍODO</h2>
          <p style={{ fontSize: '12pt', marginTop: '10px' }}>
            PERÍODO: {filterDay !== 0 ? `${filterDay}/` : ''}{filterMonth}/{filterYear}
          </p>
          <p style={{ fontSize: '10pt', marginTop: '5px' }}>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid black' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>PRODUTO</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>QTD</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>SUBTOTAL (R$)</th>
            </tr>
          </thead>
          <tbody>
            {salesByProduct.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{item.name.toUpperCase()}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>{item.isByWeight ? `${item.quantity.toFixed(3)}kg` : item.quantity}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '3px solid black' }}>
              <td colSpan={2} style={{ padding: '20px 10px', textAlign: 'right', fontSize: '14pt', fontWeight: 'bold' }}>TOTAL NO PERÍODO:</td>
              <td style={{ padding: '20px 10px', textAlign: 'right', fontSize: '16pt', fontWeight: 'bold' }}>R$ {totalSales.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const OpPanelLink = ({ to, label, icon, color }: { to: string, label: string, icon: React.ReactNode, color: string }) => (
  <a 
    href={to} 
    target="_blank" 
    rel="noopener noreferrer" 
    className={`flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all active:scale-95 hover:shadow-md ${color}`}
  >
    <div className="p-3 bg-white rounded-xl shadow-sm">{icon}</div>
    <div>
      <p className="font-bold text-sm leading-none">{label}</p>
      <p className="text-[10px] font-bold opacity-60 uppercase mt-1 tracking-widest">Abrir em Nova Guia</p>
    </div>
  </a>
);

const StatCard = ({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) => (
  <div className="stat-card bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-3">
    <div className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl ${color} flex items-center justify-center shrink-0 shadow-inner`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{title}</p>
      <p className="text-sm md:text-xl font-black text-gray-900 truncate leading-none">{value}</p>
    </div>
  </div>
);

export default AdminDashboard;
