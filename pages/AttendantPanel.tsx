
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { 
  Hash, 
  UserRound, 
  Clock, 
  X, 
  PlusCircle, 
  CheckCircle,
  LogOut,
  Printer,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Truck,
  Loader2,
  RefreshCw,
  Lock
} from 'lucide-react';
import { Order, OrderStatus, Waitstaff, StoreSettings } from '../types';
import { supabase } from '../lib/supabase';

interface Props {
  adminUser: Waitstaff | null;
  onSelectTable: (table: string | null) => void;
  orders: Order[];
  settings: StoreSettings;
  updateStatus: (id: string, status: OrderStatus) => Promise<void>;
  onLogout: () => void;
}

const AttendantPanel: React.FC<Props> = ({ adminUser, onSelectTable, orders, settings, updateStatus, onLogout }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedTableModal, setSelectedTableModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'MAPA' | 'PEDIDOS'>('MAPA');
  const [printOrder, setPrintOrder] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  const tables = Array.from({ length: 12 }, (_, i) => (i + 1).toString());

  // Se não houver usuário logado, redireciona para o login da loja atual
  if (!adminUser) {
    const storeSlug = searchParams.get('loja');
    return <Navigate to={`/login${storeSlug ? `?loja=${storeSlug}` : ''}`} />;
  }

  const isGerente = useMemo(() => adminUser?.role === 'GERENTE', [adminUser]);
  const canFinish = useMemo(() => isGerente || settings.canWaitstaffFinishOrder, [isGerente, settings.canWaitstaffFinishOrder]);
  const canCancel = useMemo(() => isGerente || settings.canWaitstaffCancelItems, [isGerente, settings.canWaitstaffCancelItems]);

  const activeOrders = useMemo(() => orders.filter(o => o.status === 'PREPARANDO' || o.status === 'PRONTO'), [orders]);

  const occupiedTables = useMemo(() => {
    const map = new Map<string, { status: string, count: number, total: number }>();
    activeOrders.forEach(o => {
      if (o.tableNumber) {
        const current = map.get(o.tableNumber);
        const newStatus = (current?.status === 'PRONTO' || o.status === 'PRONTO') ? 'PRONTO' : 'PREPARANDO';
        map.set(o.tableNumber, { 
            status: newStatus, 
            count: (current?.count || 0) + 1,
            total: (current?.total || 0) + Number(o.total)
        });
      }
    });
    return map;
  }, [activeOrders]);

  const handleTableClick = (tableNum: string) => {
    if (occupiedTables.has(tableNum)) {
      setSelectedTableModal(tableNum);
    } else {
      onSelectTable(tableNum);
      const storeSlug = searchParams.get('loja');
      navigate(`/cardapio${storeSlug ? `?loja=${storeSlug}` : ''}`);
    }
  };

  const handleQuickOrder = (type: string) => { 
    onSelectTable(null); 
    const storeSlug = searchParams.get('loja');
    navigate(`/cardapio?tipo=${type}${storeSlug ? `&loja=${storeSlug}` : ''}`); 
  };

  const handlePrintConferencia = (tableNum: string) => {
    const tableOrders = activeOrders.filter(o => o.tableNumber === tableNum);
    const combinedItems: any[] = [];
    
    tableOrders.forEach(order => {
      order.items.forEach(item => {
        const existing = combinedItems.find(i => i.productId === item.productId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          combinedItems.push({ ...item });
        }
      });
    });

    const subtotal = combinedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const totalDiscount = tableOrders.reduce((acc, o) => acc + (o.discountAmount || 0), 0);
    const finalTotal = subtotal - totalDiscount;
    
    setPrintOrder({
      id: `CONF-${tableNum}`,
      tableNumber: tableNum,
      items: combinedItems,
      total: finalTotal,
      subtotal: subtotal,
      discountAmount: totalDiscount,
      createdAt: Date.now(),
      isConferencia: true
    });
    
    setTimeout(() => { 
      window.print(); 
      setPrintOrder(null); 
    }, 300);
  };

  const updateTableOrders = async (tableNum: string, status: OrderStatus) => {
    const tableOrders = activeOrders.filter(o => o.tableNumber === tableNum);
    setIsUpdating(`table-${tableNum}`);
    try {
        await Promise.all(tableOrders.map(o => updateStatus(o.id, status)));
        setSelectedTableModal(null);
    } finally {
        setIsUpdating(null);
    }
  };

  const handleIndividualStatusUpdate = async (id: string, status: OrderStatus) => {
    setIsUpdating(id);
    try {
        await updateStatus(id, status);
    } finally {
        setIsUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-primary p-4 md:p-8 relative overflow-x-hidden">
      <style>{`
        @media print {
          @page { margin: 0; }
          html, body { margin: 0; padding: 0; background: #fff !important; }
          body * { visibility: hidden; }
          #thermal-receipt-waiter, #thermal-receipt-waiter * { visibility: visible; }
          #thermal-receipt-waiter { 
            display: block !important; 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: ${settings.thermalPrinterWidth || '80mm'}; 
            padding: 5mm; 
            background: #fff; 
            font-family: 'Courier New', monospace; 
            font-size: 10pt; 
            color: #000;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between text-white gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-secondary rounded-3xl shadow-xl text-white">
              <UserRound size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-brand font-bold">Painel Atendente</h1>
              <p className="text-secondary text-sm font-medium flex items-center gap-2">
                <Clock size={14} /> {adminUser?.name} ({adminUser?.role})
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleQuickOrder('BALCAO')} className="flex items-center gap-2 px-4 py-3 bg-white/10 rounded-2xl hover:bg-white/20 font-bold text-xs">
              <ShoppingBag size={18} /> Balcão
            </button>
            <button onClick={() => handleQuickOrder('ENTREGA')} className="flex items-center gap-2 px-4 py-3 bg-white/10 rounded-2xl hover:bg-white/20 font-bold text-xs">
              <Truck size={18} /> Entrega
            </button>
            <button onClick={onLogout} className="p-3 bg-red-500/10 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
              <LogOut size={24} />
            </button>
          </div>
        </header>

        <div className="flex bg-white/5 p-1.5 rounded-[2rem] border border-white/10">
          <button 
            onClick={() => setActiveTab('MAPA')} 
            className={`flex-1 py-4 rounded-[1.5rem] font-bold text-xs tracking-widest transition-all ${activeTab === 'MAPA' ? 'bg-secondary text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            MAPA DE MESAS
          </button>
          <button 
            onClick={() => setActiveTab('PEDIDOS')} 
            className={`flex-1 py-4 rounded-[1.5rem] font-bold text-xs tracking-widest transition-all ${activeTab === 'PEDIDOS' ? 'bg-secondary text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            PEDIDOS ATIVOS
          </button>
        </div>

        {activeTab === 'MAPA' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-fade-in">
            {tables.map(num => {
              const occ = occupiedTables.get(num);
              return (
                <button 
                  key={num} 
                  onClick={() => handleTableClick(num)} 
                  className={`relative aspect-square rounded-[2rem] p-6 text-center border-2 flex flex-col items-center justify-center transition-all active:scale-95 ${
                    occ?.status === 'PRONTO' 
                      ? 'bg-green-600 border-green-400 shadow-lg shadow-green-900/20' 
                      : occ 
                      ? 'bg-secondary border-secondary/50 shadow-lg shadow-yellow-900/20' 
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <Hash size={16} className="text-white/60 mb-1" />
                  <span className="text-5xl font-bold text-white block leading-none">{num}</span>
                  {occ && (
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                      <div className="bg-white/20 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">R$ {occ.total.toFixed(2)}</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {activeOrders.map(order => (
              <div key={order.id} className="bg-white rounded-[2.5rem] p-6 shadow-xl flex flex-col border border-gray-100 relative group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${order.type === 'MESA' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                            {order.type} {order.tableNumber && `• Mesa ${order.tableNumber}`}
                        </span>
                    </div>
                    <h3 className="font-bold text-primary truncate text-lg">
                        {order.customerName || `Pedido #${order.id.slice(-4)}`}
                    </h3>
                  </div>
                  <button onClick={() => { setPrintOrder(order); setTimeout(() => window.print(), 300); }} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-secondary hover:bg-gray-100 transition-all">
                    <Printer size={20} />
                  </button>
                </div>

                <div className="flex-1 space-y-2 mb-5 border-t border-gray-50 pt-4 min-h-[100px] overflow-y-auto custom-scrollbar">
                  {order.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-xs font-bold text-zinc-600">
                      <span className="truncate pr-2">
                        <span className="bg-zinc-100 px-1.5 py-0.5 rounded mr-1.5">{it.quantity}x</span> {it.name}
                      </span>
                      <span className="shrink-0 text-zinc-400">R$ {(it.price * it.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-gray-50">
                  <div className="flex justify-between items-center px-1">
                    <p className="text-2xl font-brand font-bold text-primary">R$ {order.total.toFixed(2)}</p>
                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${order.status === 'PRONTO' ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-orange-100 text-orange-600'}`}>
                        {order.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {order.status === 'PREPARANDO' && (
                      <button 
                        disabled={isUpdating === order.id}
                        onClick={() => handleIndividualStatusUpdate(order.id, 'PRONTO')} 
                        className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {isUpdating === order.id ? <Loader2 className="animate-spin" size={14} /> : 'MARCAR PRONTO'}
                      </button>
                    )}
                    
                    {canFinish ? (
                      <button 
                        disabled={isUpdating === order.id}
                        onClick={() => handleIndividualStatusUpdate(order.id, 'ENTREGUE')} 
                        className="flex-1 py-3.5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {isUpdating === order.id ? <Loader2 className="animate-spin" size={14} /> : 'FINALIZAR'}
                      </button>
                    ) : (
                      <div className="flex-1 py-3.5 bg-gray-100 text-gray-400 rounded-2xl text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1 cursor-not-allowed">
                        <Lock size={12} /> Apenas Gerente
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {activeOrders.length === 0 && (
              <div className="col-span-full py-24 text-center text-white/20 italic space-y-4">
                <RefreshCw size={48} className="mx-auto opacity-20" />
                <p>Nenhum pedido em aberto no momento.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedTableModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-scale-up border border-orange-100">
            <div className="p-8 border-b bg-orange-50/50 text-center relative">
              <button onClick={() => setSelectedTableModal(null)} className="absolute top-6 right-6 p-2 text-gray-300 hover:text-gray-500 transition-colors">
                <X size={24}/>
              </button>
              <div className="w-16 h-16 bg-primary text-secondary rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-black/10">
                <Hash size={32} />
              </div>
              <h2 className="text-2xl font-brand font-bold text-primary">Mesa {selectedTableModal}</h2>
              <p className="text-[10px] font-black uppercase text-orange-400 tracking-widest mt-1">
                Total acumulado: R$ {occupiedTables.get(selectedTableModal!)?.total.toFixed(2)}
              </p>
            </div>
            <div className="p-8 space-y-3">
              <button 
                onClick={() => { 
                  onSelectTable(selectedTableModal); 
                  const storeSlug = searchParams.get('loja');
                  navigate(`/cardapio${storeSlug ? `?loja=${storeSlug}` : ''}`); 
                }} 
                className="w-full flex items-center gap-4 p-5 bg-orange-50 rounded-2xl border border-orange-100 font-black text-[11px] uppercase tracking-wider text-orange-900 hover:bg-orange-100 transition-all active:scale-95"
              >
                <PlusCircle className="text-orange-500" size={20} /> Adicionar Item
              </button>
              
              <button 
                onClick={() => handlePrintConferencia(selectedTableModal!)} 
                className="w-full flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 font-black text-[11px] uppercase tracking-wider text-gray-700 hover:bg-gray-100 transition-all active:scale-95"
              >
                <Printer className="text-gray-400" size={20} /> Imprimir Conferência
              </button>

              <button 
                disabled={isUpdating === `table-${selectedTableModal}`}
                onClick={() => updateTableOrders(selectedTableModal!, 'PRONTO')} 
                className="w-full flex items-center gap-4 p-5 bg-blue-50 rounded-2xl border border-blue-100 font-black text-[11px] uppercase tracking-wider text-blue-700 hover:bg-blue-100 transition-all active:scale-95"
              >
                {isUpdating === `table-${selectedTableModal}` ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 className="text-blue-500" size={20} />} Marcar Tudo Pronto
              </button>
              
              {canFinish ? (
                <button 
                  disabled={isUpdating === `table-${selectedTableModal}`}
                  onClick={() => updateTableOrders(selectedTableModal!, 'ENTREGUE')} 
                  className="w-full flex items-center gap-4 p-5 bg-green-50 rounded-2xl border border-green-100 font-black text-[11px] uppercase tracking-wider text-green-700 hover:bg-green-100 transition-all active:scale-95"
                >
                  {isUpdating === `table-${selectedTableModal}` ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle className="text-green-500" size={20} />} Finalizar Conta
                </button>
              ) : (
                <div className="w-full flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 font-black text-[9px] uppercase tracking-wider text-gray-400 cursor-not-allowed">
                  <Lock size={16} /> Finalizar (Apenas Gerente)
                </div>
              )}

              {canCancel ? (
                <button 
                  disabled={isUpdating === `table-${selectedTableModal}`}
                  onClick={() => { if(window.confirm('Deseja realmente cancelar todos os pedidos desta mesa?')) updateTableOrders(selectedTableModal!, 'CANCELADO'); }} 
                  className="w-full flex items-center gap-4 p-5 bg-red-50 rounded-2xl border border-red-100 font-black text-[11px] uppercase tracking-wider text-red-700 hover:bg-red-100 transition-all active:scale-95"
                >
                  {isUpdating === `table-${selectedTableModal}` ? <Loader2 className="animate-spin" size={20} /> : <XCircle className="text-red-500" size={20} />} Cancelar Pedidos
                </button>
              ) : (
                <div className="w-full flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 font-black text-[9px] uppercase tracking-wider text-gray-400 cursor-not-allowed">
                  <Lock size={16} /> Cancelar (Apenas Gerente)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {printOrder && (
        <div id="thermal-receipt-waiter">
          <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
              <p style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '1mm' }}>{settings.storeName.toUpperCase()}</p>
              {settings.address && <p style={{ fontSize: '7pt', lineHeight: '1.2', margin: '1mm 0' }}>{settings.address}</p>}
              {settings.whatsapp && <p style={{ fontSize: '7pt' }}>WhatsApp: {settings.whatsapp}</p>}
              <div style={{ borderTop: '1px solid #000', margin: '3mm 0' }}></div>
              <p style={{ fontSize: '7pt' }}>{printOrder.isConferencia ? 'CONFERÊNCIA DE MESA' : 'PEDIDO DE VENDA'}</p>
              <p style={{ fontSize: '7pt' }}>EMISSÃO: {new Date().toLocaleString('pt-BR')}</p>
          </div>
          
          <div style={{ paddingBottom: '2mm' }}>
              <p style={{ fontWeight: 'bold', fontSize: '10pt', textAlign: 'center', marginBottom: '2mm' }}>
                {printOrder.tableNumber ? `MESA: ${printOrder.tableNumber}` : `PEDIDO: #${printOrder.id?.slice(-4)}`}
              </p>
              <p style={{ fontSize: '9pt' }}>ATENDENTE: {adminUser?.name.toUpperCase() || 'SISTEMA'}</p>
              <p style={{ fontSize: '9pt' }}>CLIENTE: {printOrder.customerName?.toUpperCase() || 'BALCÃO'}</p>
              {printOrder.customerPhone && <p style={{ fontSize: '9pt' }}>TEL: {printOrder.customerPhone}</p>}
              
              {printOrder.deliveryAddress && (
                <div style={{ marginTop: '2mm', padding: '2mm', background: '#f0f0f0', border: '1px solid #000' }}>
                    <p style={{ fontSize: '8pt', fontWeight: 'bold' }}>ENTREGA EM:</p>
                    <p style={{ fontSize: '8pt' }}>{printOrder.deliveryAddress.toUpperCase()}</p>
                </div>
              )}
          </div>

          <div style={{ borderTop: '1px dashed #000', padding: '2mm 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {printOrder.items.map((it: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontSize: '9pt', padding: '1.5mm 0' }}>
                        {it.isByWeight ? `${it.quantity.toFixed(3)}kg` : `${it.quantity}x`} {it.name.toUpperCase()}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '9pt' }}>{(it.price * it.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>

          {printOrder.notes && (
            <div style={{ borderTop: '1px dashed #000', padding: '2mm 0' }}>
               <p style={{ fontSize: '8pt', fontWeight: 'bold' }}>OBSERVAÇÕES:</p>
               <p style={{ fontSize: '8pt', fontStyle: 'italic' }}>- {printOrder.notes}</p>
            </div>
          )}

          <div style={{ borderTop: '1px solid #000', padding: '3mm 0', textAlign: 'right' }}>
              <p style={{ fontSize: '9pt' }}>SUBTOTAL: R$ {(printOrder.subtotal || (printOrder.total + (printOrder.discountAmount || 0))).toFixed(2)}</p>
              {printOrder.discountAmount && printOrder.discountAmount > 0 && (
                <p style={{ fontSize: '9pt', color: '#000' }}>DESCONTO: -R$ {printOrder.discountAmount.toFixed(2)}</p>
              )}
              <p style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '1mm' }}>TOTAL: R$ {printOrder.total.toFixed(2)}</p>
              <p style={{ fontSize: '8pt', marginTop: '1mm' }}>PAGAMENTO: {printOrder.paymentMethod || (printOrder.isConferencia ? 'A CONFERIR' : 'A DEFINIR')}</p>
              
              {printOrder.changeFor && printOrder.changeFor > 0 && (
                <div style={{ marginTop: '2mm' }}>
                    <p style={{ fontSize: '9pt' }}>PAGO EM DINHEIRO: R$ {printOrder.changeFor.toFixed(2)}</p>
                    <p style={{ fontSize: '10pt', fontWeight: 'bold' }}>TROCO: R$ {(printOrder.changeFor - printOrder.total).toFixed(2)}</p>
                </div>
              )}
          </div>
          
          <div style={{ borderTop: '1px dashed #000', marginTop: '4mm', paddingTop: '4mm', textAlign: 'center' }}>
              <p style={{ fontSize: '8pt' }}>OBRIGADO PELA PREFERÊNCIA!</p>
              <p style={{ fontSize: '6pt' }}>SISTEMA G & C CONVENIÊNCIA</p>
              {printOrder.isConferencia && <p style={{ fontSize: '7pt', fontWeight: 'bold', marginTop: '2mm' }}>ESTE DOCUMENTO NÃO É UM CUPOM FISCAL</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendantPanel;
