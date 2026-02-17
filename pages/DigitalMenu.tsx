
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  X, 
  ChevronLeft, 
  Plus as PlusIcon, 
  Minus as MinusIcon, 
  CheckCircle, 
  Loader2, 
  Search, 
  MapPin, 
  ExternalLink, 
  Send, 
  Flame, 
  Utensils, 
  ShoppingBag, 
  Truck, 
  MessageCircle, 
  Store, 
  Scale,
  Ticket,
  AlertTriangle,
  Power,
  Info,
  Phone,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Tag,
  Check
} from 'lucide-react';
import { Product, StoreSettings, Order, OrderItem, OrderType, PaymentMethod, Waitstaff } from '../types';

interface Props {
  products: Product[];
  categories: string[];
  settings: StoreSettings;
  orders: Order[];
  addOrder: (order: Order) => Promise<void>;
  tableNumber: string | null;
  onLogout: () => void;
  onCloseMenu?: () => void;
  isWaitstaff?: boolean;
}

const DigitalMenu: React.FC<Props> = ({ products, categories: externalCategories, settings, addOrder, tableNumber: initialTable, onLogout, onCloseMenu, isWaitstaff: initialIsWaitstaff = false }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlTable = searchParams.get('mesa');
  const urlType = searchParams.get('tipo');
  
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'success'>('cart');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [weightProduct, setWeightProduct] = useState<Product | null>(null);
  const [selectedWeightGrams, setSelectedWeightGrams] = useState<string>("");

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discount: number} | null>(null);

  const effectiveTable = initialTable || urlTable || null;
  
  const isStoreClosed = settings.isStoreOpen === false;

  const [isWaitstaff, setIsWaitstaff] = useState(initialIsWaitstaff || !!localStorage.getItem('vovo-guta-waitstaff'));

  const [hasSelectedMode, setHasSelectedMode] = useState(() => {
    if (isWaitstaff) return true;
    if (effectiveTable && settings.isTableOrderActive) return true;
    if (urlType && ['BALCAO', 'ENTREGA', 'MESA'].includes(urlType)) return true;
    return false;
  });
  
  const [orderType, setOrderType] = useState<OrderType>(() => {
    if (urlType === 'BALCAO' && settings.isCounterPickupActive) return 'BALCAO';
    if (urlType === 'ENTREGA' && settings.isDeliveryActive) return 'ENTREGA';
    if (effectiveTable && settings.isTableOrderActive) return 'MESA';
    return isWaitstaff ? 'MESA' : 'BALCAO';
  });

  const [manualTable, setManualTable] = useState(effectiveTable || '');
  const [payment, setPayment] = useState<PaymentMethod>('PIX');
  const [changeFor, setChangeFor] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  const [activeWaitstaff, setActiveWaitstaff] = useState<Waitstaff | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('vovo-guta-waitstaff');
    if (saved) {
        const parsed = JSON.parse(saved);
        setActiveWaitstaff(parsed);
        setIsWaitstaff(true);
    }
  }, []);

  const categories = useMemo(() => ['Todos', ...externalCategories], [externalCategories]);
  
  const featuredProduct = useMemo(() => {
    const today = new Date().getDay();
    return products.find(p => p.featuredDay === today && p.isActive);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = activeCategory === 'Todos' || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchTerm]);

  const handleBack = () => {
    if (onCloseMenu) {
      onCloseMenu();
      return;
    }
    
    if (isWaitstaff) {
      onLogout();
      navigate('/atendimento');
      return;
    }
    
    setHasSelectedMode(false);
  };

  const handleAddToCart = (product: Product) => {
    if (!product.isActive) return;
    if (product.isByWeight) {
      setWeightProduct(product);
      setSelectedWeightGrams("");
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { 
        productId: product.id, 
        name: product.name, 
        description: product.description,
        price: product.price, 
        quantity: 1, 
        isByWeight: false
      }];
    });
  };

  const confirmWeightAddition = () => {
    if (!weightProduct || !selectedWeightGrams) return;
    const grams = parseFloat(selectedWeightGrams.replace(',', '.'));
    if (isNaN(grams) || grams <= 0) {
      alert("Por favor, informe um peso válido em gramas.");
      return;
    }
    const quantityKg = grams / 1000;
    const productToAdd = { ...weightProduct };
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.productId === productToAdd.id);
      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex] = { 
          ...newCart[existingIndex], 
          quantity: newCart[existingIndex].quantity + quantityKg 
        };
        return newCart;
      }
      return [...prev, { 
        productId: productToAdd.id, 
        name: productToAdd.name, 
        description: productToAdd.description,
        price: productToAdd.price, 
        quantity: quantityKg, 
        isByWeight: true
      }];
    });
    setWeightProduct(null);
    setSelectedWeightGrams("");
  };

  const updateCartItemQuantity = (productId: string, delta: number) => {
    setCart(prev => {
        return prev.map(item => {
            if (item.productId === productId) {
                const step = item.isByWeight ? 0.050 : 1;
                const newQty = item.quantity + (delta * step);
                return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
        }).filter(Boolean) as OrderItem[];
    });
  };

  const { subtotal, discountAmount, cartTotal, isAnyItemEligibleForCoupon } = useMemo(() => {
    const sub = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    let disc = 0;
    
    const eligibleIds = settings.applicableProductIds || [];
    const eligibleItems = cart.filter(item => settings.isCouponForAllProducts || eligibleIds.includes(item.productId));
    const anyEligible = eligibleItems.length > 0;

    if (appliedCoupon) {
      if (settings.isCouponForAllProducts !== false) {
        disc = sub * (appliedCoupon.discount / 100);
      } else {
        const eligibleSubtotal = cart.reduce((acc, item) => {
           return eligibleIds.includes(item.productId) ? acc + (item.price * item.quantity) : acc;
        }, 0);
        disc = eligibleSubtotal * (appliedCoupon.discount / 100);
      }
    }
    return { subtotal: sub, discountAmount: disc, cartTotal: Math.max(0, sub - disc), isAnyItemEligibleForCoupon: anyEligible };
  }, [cart, appliedCoupon, settings]);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    
    if (settings.isCouponActive && couponCode.toUpperCase() === settings.couponName?.toUpperCase()) {
      if (settings.isCouponForAllProducts === false) {
        if (!isAnyItemEligibleForCoupon) {
          alert("Este cupom não é válido para nenhum dos produtos selecionados.");
          return;
        }
      }
      setAppliedCoupon({ code: settings.couponName!, discount: settings.couponDiscount || 0 });
      setCouponCode('');
    } else {
      alert("Cupom inválido ou expirado.");
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (orderType === 'MESA' && !manualTable) { alert('Informe o número da mesa.'); return; }
    if (orderType === 'BALCAO' && !customerName) { alert('Informe o seu nome.'); return; }
    if (orderType === 'ENTREGA' && (!customerName || !customerPhone || !deliveryAddress)) { 
      alert('Preencha os dados de entrega.'); 
      return; 
    }

    setIsSending(true);
    const orderChangeFor = (payment === 'DINHEIRO' && changeFor) ? parseFloat(changeFor.replace(',', '.')) : undefined;
    const timestampId = Date.now().toString();

    const finalOrder: Order = {
      id: timestampId, 
      type: orderType, 
      items: cart, 
      status: 'PREPARANDO', 
      total: cartTotal, 
      createdAt: Date.now(), 
      paymentMethod: payment,
      changeFor: orderChangeFor,
      notes: notes.trim() || undefined, 
      tableNumber: orderType === 'MESA' ? manualTable : undefined,
      customerName: customerName.trim() || undefined, 
      customerPhone: customerPhone.trim() || undefined,
      deliveryAddress: orderType === 'ENTREGA' ? deliveryAddress.trim() : undefined,
      waitstaffName: activeWaitstaff?.name || undefined,
      couponApplied: appliedCoupon?.code || undefined,
      discountAmount: discountAmount || undefined
    };

    try { 
      await addOrder(finalOrder); 
      setCart([]); 
      setAppliedCoupon(null);
      setCheckoutStep('success'); 
    } catch (err: any) { 
      alert(`Erro ao enviar pedido para o sistema: ${err.message}`); 
    } finally { 
      setIsSending(false); 
    }
  };

  const selectMode = (type: OrderType) => {
    setOrderType(type);
    setHasSelectedMode(true);
  };

  if (!hasSelectedMode && !isWaitstaff) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-6 text-zinc-900">
        <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl space-y-10 border border-orange-100 animate-scale-up relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary opacity-10 rounded-full blur-3xl"></div>
          <div className="text-center relative z-10">
            <div className="relative inline-block mb-6">
                <img src={settings.logoUrl} className="w-24 h-24 rounded-full border-4 border-orange-50 object-cover shadow-2xl" alt="Logo" />
                {!isStoreClosed && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>
                )}
            </div>
            <h1 className="text-2xl font-brand font-bold text-primary leading-tight">Olá! Seja bem-vindo.</h1>
            <p className="text-xs text-gray-400 mt-2 uppercase tracking-[0.2em] font-black">
              {isStoreClosed ? 'ESTAMOS FECHADOS NO MOMENTO' : 'Como deseja fazer seu pedido?'}
            </p>
          </div>
          {isStoreClosed ? (
            <div className="bg-red-50 p-8 rounded-[2rem] border border-red-100 text-center space-y-4">
               <Power size={56} className="text-red-300 mx-auto" strokeWidth={1.5} />
               <p className="text-sm font-bold text-red-700 leading-relaxed uppercase">
                  Nossa loja física e digital estão pausadas agora. Voltaremos em breve!
               </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
                {settings.isTableOrderActive && (
                  <button onClick={() => selectMode('MESA')} className="group flex items-center justify-between p-5 bg-orange-50/50 hover:bg-orange-100/50 rounded-[1.8rem] transition-all border border-orange-100 active:scale-95 text-left">
                      <div className="flex items-center gap-5">
                          <div className="p-4 bg-white rounded-2xl text-orange-600 shadow-sm transition-transform group-hover:scale-110"><Utensils size={28} /></div>
                          <div>
                            <p className="font-bold text-lg text-primary leading-none">Na Mesa</p>
                            <p className="text-[10px] text-orange-700 opacity-60 font-black uppercase mt-1 tracking-wider">Estou no salão</p>
                          </div>
                      </div>
                      <ArrowRight className="text-orange-200 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" size={20} />
                  </button>
                )}
                {settings.isCounterPickupActive && (
                  <button onClick={() => selectMode('BALCAO')} className="group flex items-center justify-between p-5 bg-blue-50/50 hover:bg-blue-100/50 rounded-[1.8rem] transition-all border border-blue-100 active:scale-95 text-left">
                      <div className="flex items-center gap-5">
                          <div className="p-4 bg-white rounded-2xl text-blue-600 shadow-sm transition-transform group-hover:scale-110"><ShoppingBag size={28} /></div>
                          <div>
                            <p className="font-bold text-lg text-primary leading-none">Balcão</p>
                            <p className="text-[10px] text-blue-700 opacity-60 font-black uppercase mt-1 tracking-wider">Vou retirar aqui</p>
                          </div>
                      </div>
                      <ArrowRight className="text-blue-200 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" size={20} />
                  </button>
                )}
                {settings.isDeliveryActive && (
                  <button onClick={() => selectMode('ENTREGA')} className="group flex items-center justify-between p-5 bg-green-50/50 hover:bg-green-100/50 rounded-[1.8rem] transition-all border border-green-100 active:scale-95 text-left">
                      <div className="flex items-center gap-5">
                          <div className="p-4 bg-white rounded-2xl text-green-600 shadow-sm transition-transform group-hover:scale-110"><Truck size={28} /></div>
                          <div>
                            <p className="font-bold text-lg text-primary leading-none">Entrega</p>
                            <p className="text-[10px] text-green-700 opacity-60 font-black uppercase mt-1 tracking-wider">Receber em casa</p>
                          </div>
                      </div>
                      <ArrowRight className="text-green-200 group-hover:text-green-400 group-hover:translate-x-1 transition-all" size={20} />
                  </button>
                )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-orange-50/40 text-primary relative flex flex-col font-sans text-zinc-900">
      <header className={`sticky top-0 z-30 shadow-md ${isWaitstaff ? 'bg-secondary' : 'bg-primary'} text-white p-3 md:p-4 transition-all w-full`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full shrink-0">
                <ChevronLeft size={22} />
            </button>
            <div className="flex flex-col min-w-0">
                <h1 className="font-brand text-sm md:text-base font-bold leading-none truncate">{settings.storeName}</h1>
                <span className="text-[9px] uppercase font-black opacity-70 truncate mt-0.5">
                  {orderType} {orderType === 'MESA' && manualTable ? `• Mesa ${manualTable}` : ''}
                </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsInfoOpen(true)} className="p-2.5 bg-white/10 rounded-full shrink-0 active:scale-90 transition-transform">
              <Info size={20} />
            </button>
            <button onClick={() => { setIsCartOpen(true); setCheckoutStep('cart'); }} className="relative p-2.5 bg-white/10 rounded-full shrink-0 active:scale-90 transition-transform">
              <ShoppingCart size={20} />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-secondary text-[9px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-primary">{cart.length}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-5 flex-1 pb-24 text-zinc-900 overflow-x-hidden w-full box-border">
        {isStoreClosed && !isWaitstaff && (
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-3 animate-pulse">
            <AlertTriangle className="text-red-500 shrink-0" size={20} />
            <p className="text-[10px] font-black uppercase text-red-700 tracking-widest">A loja está fechada. Apenas visualização.</p>
          </div>
        )}

        <div className="relative group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="O que deseja comer hoje?" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl outline-none shadow-sm border border-gray-100 focus:ring-2 focus:ring-secondary/20 transition-all text-sm" />
        </div>

        {!searchTerm && featuredProduct && activeCategory === 'Todos' && (
          <section className="animate-fade-in w-full">
             <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-4 shadow-xl border border-orange-100 flex flex-row gap-3 sm:gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-1.5 sm:p-2 bg-orange-500 text-white rounded-bl-2xl z-20 shadow-sm">
                    <Flame size={12} className="animate-pulse" />
                </div>
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-gray-100">
                    <img src={featuredProduct.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt={featuredProduct.name} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                   <div>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="bg-orange-100 text-orange-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Promoção do Dia</span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-primary truncate leading-tight">{featuredProduct.name}</h3>
                      <p className="text-[9px] sm:text-[10px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">{featuredProduct.description}</p>
                   </div>
                   <div className="flex items-end justify-between gap-1 mt-1">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm sm:text-lg font-black text-secondary whitespace-nowrap">R$ {featuredProduct.price.toFixed(2)}{featuredProduct.isByWeight ? '/kg' : ''}</span>
                      </div>
                      {!isStoreClosed && (
                        <button 
                          onClick={() => handleAddToCart(featuredProduct)} 
                          className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-white font-bold text-[9px] sm:text-[11px] shadow-lg active:scale-95 transition-all flex items-center gap-1.5 shrink-0 ${isWaitstaff ? 'bg-secondary' : 'bg-primary'}`}
                        >
                          <PlusIcon size={12} /> <span className="whitespace-nowrap">ADICIONAR</span>
                        </button>
                      )}
                   </div>
                </div>
             </div>
          </section>
        )}

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-3 sm:-mx-4 px-3 sm:px-4 w-full">
            {categories.map(cat => (
              <button key={cat} onClick={() => { setActiveCategory(cat); setSearchTerm(''); }} className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl whitespace-nowrap font-bold text-[10px] sm:text-[11px] border transition-all ${activeCategory === cat ? (isWaitstaff ? 'bg-secondary text-white border-secondary shadow-sm' : 'bg-primary text-white border-primary shadow-sm') : 'bg-white text-gray-400 border-gray-100'}`}>{cat}</button>
            ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
          {filteredProducts.map(product => (
            <div key={product.id} className={`bg-white rounded-2xl p-2.5 sm:p-3 shadow-sm flex gap-2.5 sm:gap-3 items-center border border-gray-50 transition-all w-full box-border ${!product.isActive ? 'opacity-50 grayscale' : ''}`}>
              <div className="relative shrink-0">
                <img src={product.imageUrl} className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 object-cover rounded-xl" alt={product.name} />
                {product.isByWeight && <div className="absolute -top-1 -right-1 bg-blue-600 text-white p-1 rounded-lg border border-white shadow-sm"><Scale size={10} /></div>}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                <div className="min-w-0">
                  <h3 className="font-bold text-[11px] sm:text-[12px] md:text-sm truncate leading-tight text-zinc-900">{product.name}</h3>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 line-clamp-1 mt-0.5">{product.description}</p>
                </div>
                <div className="flex items-center justify-between mt-2 gap-1.5">
                  <span className="font-bold text-secondary text-[10px] sm:text-xs md:text-sm whitespace-nowrap">R$ {product.price.toFixed(2)}{product.isByWeight ? '/kg' : ''}</span>
                  {!isStoreClosed && (
                    <button 
                      onClick={() => handleAddToCart(product)} 
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-white flex items-center gap-1 shadow-sm text-[9px] sm:text-[10px] font-bold transition-all active:scale-95 shrink-0 ${isWaitstaff ? 'bg-secondary' : 'bg-primary'}`}
                    >
                      <PlusIcon size={12} />
                      <span className="whitespace-nowrap">Adicionar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal de Informações da Loja */}
      {isInfoOpen && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl animate-scale-up overflow-hidden border border-orange-100">
            <div className="p-8 border-b bg-orange-50 text-center relative text-zinc-900">
               <button onClick={() => setIsInfoOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600">
                  <X size={24} />
               </button>
               <img src={settings.logoUrl} className="w-20 h-20 rounded-full border-4 border-white shadow-xl mx-auto mb-4 object-cover" />
               <h2 className="text-xl font-brand font-bold text-primary">{settings.storeName}</h2>
               <div className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase mt-2 tracking-widest ${settings.isStoreOpen ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {settings.isStoreOpen ? 'Aberto Agora' : 'Fechado no Momento'}
               </div>
            </div>
            <div className="p-8 space-y-4">
               {settings.address && (
                 <div className="flex items-start gap-4 p-2">
                    <div className="p-3 bg-gray-50 rounded-2xl text-primary border border-gray-100"><MapPin size={20} /></div>
                    <div className="min-w-0">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Localização</p>
                       <p className="text-sm font-bold text-gray-700 leading-snug">{settings.address}</p>
                       <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`} target="_blank" className="text-[10px] font-black text-secondary flex items-center gap-1 mt-1">
                          VER NO MAPA <Navigation size={10} />
                       </a>
                    </div>
                 </div>
               )}
               {settings.whatsapp && (
                 <div className="flex items-start gap-4 p-2">
                    <div className="p-3 bg-gray-50 rounded-2xl text-green-600 border border-gray-100"><Phone size={20} /></div>
                    <div className="min-w-0">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">WhatsApp</p>
                       <p className="text-sm font-bold text-gray-700 leading-snug">{settings.whatsapp}</p>
                       <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" className="text-[10px] font-black text-green-600 flex items-center gap-1 mt-1">
                          INICIAR CONVERSA <MessageCircle size={10} />
                       </a>
                    </div>
                 </div>
               )}
               
               <div className="pt-4 border-t border-gray-100 space-y-3">
                  <button 
                    onClick={() => { setIsInfoOpen(false); navigate('/login'); }} 
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <ShieldCheck size={18} /> Acesso Administrativo
                  </button>
                  <button onClick={() => setIsInfoOpen(false)} className="w-full py-3 text-gray-400 font-bold text-xs uppercase tracking-widest">
                    Voltar
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Peso */}
      {weightProduct && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl animate-scale-up overflow-hidden border border-orange-100">
            <div className="p-8 border-b bg-orange-50 text-center text-zinc-900">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-orange-100 text-orange-500">
                <Scale size={32} />
              </div>
              <h2 className="text-xl font-bold text-primary">{weightProduct.name}</h2>
              <p className="text-[10px] font-black uppercase text-orange-400 tracking-widest mt-1">Preço: R$ {weightProduct.price.toFixed(2)}/kg</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-gray-400 ml-1 tracking-widest">Peso em Gramas</label>
                <div className="relative">
                   <input 
                    type="number" 
                    autoFocus
                    placeholder="Ex: 250" 
                    value={selectedWeightGrams} 
                    onChange={e => setSelectedWeightGrams(e.target.value)}
                    className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-2xl text-center focus:ring-2 focus:ring-orange-200 transition-all text-zinc-900"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 font-bold">g</span>
                </div>
              </div>

              {selectedWeightGrams && parseFloat(selectedWeightGrams) > 0 && (
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center animate-fade-in">
                   <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none mb-1">Valor Calculado</p>
                   <p className="text-2xl font-brand font-bold text-primary">R$ {((weightProduct.price * parseFloat(selectedWeightGrams)) / 1000).toFixed(2)}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setWeightProduct(null)} className="flex-1 py-4 text-gray-400 font-bold text-xs uppercase tracking-widest">Cancelar</button>
                <button 
                  disabled={!selectedWeightGrams || parseFloat(selectedWeightGrams) <= 0}
                  onClick={confirmWeightAddition} 
                  className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-30"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl animate-slide-up text-zinc-900">
            <div className="px-5 py-5 border-b flex items-center justify-between bg-gray-50 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-primary" />
                <h2 className="font-bold text-sm text-zinc-900">{checkoutStep === 'cart' ? 'Minha Sacola' : checkoutStep === 'details' ? 'Finalizar Pedido' : 'Pedido Concluído'}</h2>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 text-zinc-900 custom-scrollbar">
              {checkoutStep === 'cart' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    {cart.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center text-gray-300 space-y-4">
                          <ShoppingBag size={56} className="opacity-10" />
                          <p className="italic text-xs font-medium">Sacola vazia...</p>
                      </div>
                    ) : (
                      <>
                        {cart.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-gray-50 p-3.5 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex-1 mr-3 min-w-0">
                                <p className="font-bold text-[11px] truncate leading-tight text-zinc-800">{item.name}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-1">
                                  {item.isByWeight ? `${item.quantity.toFixed(3).replace('.', ',')}kg` : `${item.quantity}x`} • R$ {(item.price * item.quantity).toFixed(2)}
                                </p>
                            </div>
                            <div className="flex items-center bg-white rounded-xl border border-gray-100 p-0.5 shadow-sm">
                                <button onClick={() => updateCartItemQuantity(item.productId, -1)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><MinusIcon size={14} /></button>
                                <span className="w-16 text-center text-[10px] font-black">{item.isByWeight ? `${item.quantity.toFixed(3).replace('.', ',')}kg` : item.quantity}</span>
                                <button onClick={() => updateCartItemQuantity(item.productId, 1)} className="p-1.5 text-gray-400 hover:text-green-500 transition-colors"><PlusIcon size={14} /></button>
                            </div>
                          </div>
                        ))}

                        {/* SEÇÃO DE CUPOM */}
                        {settings.isCouponActive && (settings.isCouponForAllProducts || isAnyItemEligibleForCoupon) && (
                          <div className="mt-4 p-4 bg-orange-50/50 rounded-2xl border-2 border-dashed border-orange-200 animate-fade-in">
                            <div className="flex items-center gap-2 mb-3">
                              <Ticket className="text-orange-500" size={16} />
                              <span className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Cupom de Desconto</span>
                            </div>
                            
                            {appliedCoupon ? (
                              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-orange-200 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <Check className="text-green-500" size={16} />
                                  <div>
                                    <p className="text-[10px] font-black uppercase text-primary leading-none">{appliedCoupon.code}</p>
                                    <p className="text-[8px] font-bold text-green-600 uppercase mt-1">CUPOM APLICADO COM SUCESSO</p>
                                  </div>
                                </div>
                                <button onClick={() => setAppliedCoupon(null)} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600">Remover</button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                  <input 
                                    type="text" 
                                    placeholder="DIGITE O CÓDIGO" 
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none text-[11px] font-bold focus:ring-2 focus:ring-orange-300 transition-all uppercase"
                                  />
                                </div>
                                <button 
                                  onClick={handleApplyCoupon}
                                  className="px-5 py-3 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-md"
                                >
                                  APLICAR
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {checkoutStep === 'details' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    {orderType === 'MESA' && !effectiveTable && (
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Nº da Mesa</label>
                         <input type="number" placeholder="00" value={manualTable} onChange={e => setManualTable(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-black text-sm focus:ring-2 focus:ring-primary/10" />
                      </div>
                    )}
                    <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Seu Nome</label>
                       <input type="text" placeholder="Como te chamamos?" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-primary/10" />
                    </div>
                    {orderType === 'ENTREGA' && (
                      <>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">WhatsApp</label>
                           <input type="tel" placeholder="(00) 00000-0000" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-primary/10" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Endereço de Entrega</label>
                           <textarea placeholder="Rua, número, bairro..." value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-sm h-24 resize-none focus:ring-2 focus:ring-primary/10" />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Pagamento</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['PIX', 'CARTAO', 'DINHEIRO'] as PaymentMethod[]).map(m => (
                        <button key={m} onClick={() => setPayment(m)} className={`py-3.5 rounded-2xl text-[11px] font-bold border transition-all ${payment === m ? 'bg-primary text-white border-primary shadow-lg scale-[1.03]' : 'bg-white text-gray-400 border-gray-100'}`}>{m}</button>
                      ))}
                    </div>
                  </div>

                  {payment === 'DINHEIRO' && (
                    <div className="space-y-1 animate-scale-up">
                      <label className="text-[10px] font-black text-orange-600 uppercase ml-1 tracking-widest">Troco para quanto?</label>
                      <input type="number" placeholder="Ex: 50,00" value={changeFor} onChange={e => setChangeFor(e.target.value)} className="w-full p-4 bg-orange-50 border-orange-100 border rounded-2xl outline-none font-black text-sm focus:ring-1 focus:ring-orange-300" />
                    </div>
                  )}

                  <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Observações</label>
                     <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tire a cebola, troque o molho..." className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-xs h-20 resize-none focus:ring-2 focus:ring-primary/10" />
                  </div>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-6 animate-scale-up">
                    <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[2.5rem] flex items-center justify-center shadow-inner border-2 border-green-100"><CheckCircle size={48} /></div>
                    <div>
                      <h2 className="text-2xl font-bold text-primary">Pedido Enviado!</h2>
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-2 leading-relaxed">Já estamos cuidando da sua <br/> delícia por aqui.</p>
                    </div>
                    <button onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); if(onCloseMenu) onCloseMenu(); }} className="w-full py-4.5 text-white bg-primary rounded-2xl font-bold shadow-xl active:scale-95 transition-transform text-xs uppercase tracking-widest">Concluído</button>
                </div>
              )}
            </div>

            {checkoutStep !== 'success' && (
              <div className="px-5 py-6 bg-white border-t text-zinc-900 shrink-0 shadow-[0_-15px_40px_rgba(0,0,0,0.08)]">
                <div className="space-y-3 mb-5 px-1">
                    <div className="flex justify-between items-center text-xs font-bold text-zinc-400">
                      <span>Subtotal:</span>
                      <span>R$ {subtotal.toFixed(2)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between items-center text-xs font-bold text-green-600">
                        <span>Desconto ({appliedCoupon.code}):</span>
                        <span>- R$ {discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">Total Geral</span>
                        <span className="text-2xl font-brand font-bold text-primary">R$ {cartTotal.toFixed(2)}</span>
                    </div>
                </div>
                {checkoutStep === 'cart' ? (
                  <button disabled={cart.length === 0} onClick={() => setCheckoutStep('details')} className="w-full py-4.5 rounded-2xl font-bold text-white bg-primary shadow-xl disabled:opacity-30 active:scale-95 transition-transform text-xs uppercase tracking-widest">Finalizar Pedido</button>
                ) : (
                  <div className="flex gap-4">
                    <button onClick={() => setCheckoutStep('cart')} className="flex-1 py-4.5 text-gray-400 font-bold text-[10px] uppercase tracking-widest">Voltar</button>
                    <button disabled={isSending} onClick={handleCheckout} className="flex-[3] py-4.5 rounded-2xl font-bold text-white bg-primary shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-transform text-xs uppercase tracking-widest">
                      {isSending ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
                      {isSending ? 'Enviando...' : 'Confirmar Pedido'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .py-4\\.5 { padding-top: 1.125rem; padding-bottom: 1.125rem; }
      `}</style>
    </div>
  );
};

export default DigitalMenu;
