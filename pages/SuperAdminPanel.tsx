
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Store, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  Search, 
  Loader2, 
  Camera, 
  MapPin, 
  Phone, 
  Globe,
  Lock,
  Unlock,
  Copy,
  Check,
  Zap,
  ArrowUpRight,
  UserPlus,
  X,
  Package,
  Layers,
  Edit2,
  ChevronRight,
  ChevronLeft,
  Settings,
  Save,
  LayoutDashboard
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StoreProfile, Product } from '../types';
import { INITIAL_SETTINGS } from '../constants';

export default function SuperAdminPanel() {
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para Gerenciamento de Conteúdo da Loja
  const [editingStore, setEditingStore] = useState<StoreProfile | null>(null);
  const [storeCategories, setStoreCategories] = useState<any[]>([]);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [isManagingContent, setIsManagingContent] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'perfil' | 'inventario'>('perfil');

  // Estados para Edição de Perfil
  const [editProfileData, setEditProfileData] = useState({
    name: '',
    slug: '',
    address: '',
    whatsapp: '',
    logoUrl: ''
  });

  // Estados para Novo Produto Manual
  const [showProductForm, setShowProductForm] = useState(false);
  const [productFormData, setProductFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    imageUrl: '',
    isActive: true
  });
  const productImgInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    whatsapp: '',
    logoUrl: ''
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_profiles')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (data) {
        const mapped = (data as any[]).map(s => ({
          ...s,
          id: s.id,
          isActive: s.isactive ?? s.isActive ?? true,
          logoUrl: s.logourl ?? s.logoUrl ?? '',
          createdAt: Number(s.createdat ?? s.createdAt ?? Date.now()),
          settings: typeof s.settings === 'string' ? JSON.parse(s.settings) : s.settings
        }));
        setStores(mapped);
      }
    } catch (err) {
      console.error("Erro ao buscar lojas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManageContent = async (store: StoreProfile) => {
    setEditingStore(store);
    setEditProfileData({
      name: store.name,
      slug: store.slug,
      address: store.address,
      whatsapp: store.whatsapp,
      logoUrl: store.logoUrl
    });
    setIsManagingContent(true);
    setActiveSubTab('perfil');
    fetchStoreInventory(store.id);
  };

  const fetchStoreInventory = async (storeId: string) => {
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').eq('store_id', storeId).select('*'),
      supabase.from('products').eq('store_id', storeId).select('*')
    ]);
    if (catRes.data) setStoreCategories(catRes.data);
    if (prodRes.data) {
        const mappedProds = prodRes.data.map((p: any) => ({
            ...p,
            id: p.id,
            isActive: p.isactive ?? p.isActive ?? true,
            imageUrl: p.imageurl ?? p.imageUrl ?? ''
        }));
        setStoreProducts(mappedProds);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    setIsSaving(true);
    
    const updatedSettings = {
        ...editingStore.settings,
        storeName: editProfileData.name,
        logoUrl: editProfileData.logoUrl,
        address: editProfileData.address,
        whatsapp: editProfileData.whatsapp
    };

    const { error } = await supabase
      .from('store_profiles')
      .eq('id', editingStore.id)
      .update({
        name: editProfileData.name,
        slug: editProfileData.slug,
        address: editProfileData.address,
        whatsapp: editProfileData.whatsapp,
        logourl: editProfileData.logoUrl,
        settings: JSON.stringify(updatedSettings)
      });
    
    if (error) alert("Erro ao atualizar perfil");
    else {
      alert("Perfil atualizado com sucesso!");
      fetchStores();
    }
    setIsSaving(false);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !editingStore) return;
    const { error } = await supabase.from('categories').insert([{
      store_id: editingStore.id,
      name: newCatName.trim()
    }]);
    if (error) alert("Erro ao adicionar categoria (já existe ou erro de conexão)");
    else {
      setNewCatName('');
      fetchStoreInventory(editingStore.id);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Remover esta categoria?")) return;
    await supabase.from('categories').eq('id', id).delete();
    fetchStoreInventory(editingStore!.id);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    
    const productToSave = {
      id: Math.random().toString(36).substr(2, 9),
      store_id: editingStore.id,
      name: productFormData.name,
      description: productFormData.description,
      price: Number(productFormData.price),
      category: productFormData.category,
      imageurl: productFormData.imageUrl,
      isactive: true
    };

    const { error } = await supabase.from('products').insert([productToSave]);
    if (error) alert("Erro ao salvar produto");
    else {
      setShowProductForm(false);
      setProductFormData({ name: '', description: '', price: 0, category: '', imageUrl: '', isActive: true });
      fetchStoreInventory(editingStore.id);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Excluir este produto?")) return;
    await supabase.from('products').eq('id', id).delete();
    fetchStoreInventory(editingStore!.id);
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const slug = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const newStore = {
      name: formData.name,
      slug: slug,
      address: formData.address,
      whatsapp: formData.whatsapp,
      logourl: formData.logoUrl || INITIAL_SETTINGS.logoUrl,
      isactive: true,
      createdat: Date.now(),
      settings: JSON.stringify({ 
        ...INITIAL_SETTINGS, 
        storeName: formData.name,
        logoUrl: formData.logoUrl || INITIAL_SETTINGS.logoUrl,
        address: formData.address,
        whatsapp: formData.whatsapp
      })
    };

    const { error } = await supabase.from('store_profiles').insert([newStore]);
    
    if (error) alert("Erro ao criar loja");
    else {
      setShowModal(false);
      setFormData({ name: '', slug: '', address: '', whatsapp: '', logoUrl: '' });
      fetchStores();
    }
    setIsSaving(false);
  };

  const toggleStoreStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('store_profiles').eq('id', id).update({ isactive: !currentStatus });
    fetchStores();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'store' | 'product' | 'edit-perfil') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (target === 'store') setFormData(prev => ({ ...prev, logoUrl: result }));
        else if (target === 'edit-perfil') setEditProfileData(prev => ({ ...prev, logoUrl: result }));
        else setProductFormData(prev => ({ ...prev, imageUrl: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/#/cardapio?loja=${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(slug);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredStores = stores.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isManagingContent && editingStore) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] p-6">
        <div className="max-w-6xl mx-auto space-y-8">
           <button onClick={() => setIsManagingContent(false)} className="flex items-center gap-2 text-slate-500 font-bold hover:text-primary transition-all">
             <ChevronLeft /> Voltar para Lojas
           </button>

           <div className="bg-white rounded-[3rem] p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between border border-slate-100 gap-6">
             <div className="flex items-center gap-6">
               <img src={editingStore.logoUrl} className="w-20 h-20 rounded-2xl object-cover border-4 border-slate-50" />
               <div>
                 <h1 className="text-3xl font-brand font-bold text-slate-800">{editingStore.name}</h1>
                 <p className="text-sm font-bold text-slate-400">GERENCIAMENTO DE LOJA</p>
               </div>
             </div>
             <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => setActiveSubTab('perfil')} className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'perfil' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}>DADOS DA LOJA</button>
                <button onClick={() => setActiveSubTab('inventario')} className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'inventario' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}>INVENTÁRIO / PRODUTOS</button>
             </div>
           </div>

           {activeSubTab === 'perfil' ? (
             <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 animate-scale-up">
                <h2 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2"><Settings className="text-secondary" /> Editar Perfil da Loja</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome da Loja</label>
                            <input required type="text" value={editProfileData.name} onChange={e => setEditProfileData({...editProfileData, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Slug (URL)</label>
                            <input required type="text" value={editProfileData.slug} onChange={e => setEditProfileData({...editProfileData, slug: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Logotipo</label>
                        <div className="flex items-center gap-6">
                            <img src={editProfileData.logoUrl} className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-100" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all flex items-center gap-2">
                                <Camera size={16} /> Alterar Imagem
                            </button>
                            <input type="file" ref={fileInputRef} onChange={e => handleFileChange(e, 'edit-perfil')} className="hidden" accept="image/*" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">WhatsApp</label>
                            <input type="text" value={editProfileData.whatsapp} onChange={e => setEditProfileData({...editProfileData, whatsapp: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Endereço</label>
                            <input type="text" value={editProfileData.address} onChange={e => setEditProfileData({...editProfileData, address: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold" />
                        </div>
                    </div>

                    <div className="pt-6">
                        <button disabled={isSaving} type="submit" className="px-10 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl flex items-center gap-2 hover:bg-black transition-all">
                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar Alterações
                        </button>
                    </div>
                </form>
             </div>
           ) : (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-scale-up">
               {/* Coluna Categorias */}
               <div className="lg:col-span-4 bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 h-fit">
                 <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                   <Layers className="text-secondary" /> Categorias
                 </h2>
                 <div className="flex gap-2 mb-6">
                   <input 
                     type="text" 
                     value={newCatName} 
                     onChange={e => setNewCatName(e.target.value)}
                     placeholder="Nova categoria..."
                     className="flex-1 px-4 py-3 bg-slate-50 rounded-xl outline-none font-medium border border-slate-100 focus:border-secondary transition-all"
                   />
                   <button onClick={handleAddCategory} className="p-3 bg-secondary text-primary rounded-xl font-bold">
                     <Plus />
                   </button>
                 </div>
                 <div className="space-y-2">
                   {storeCategories.map(cat => (
                     <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group">
                       <span className="font-bold text-slate-700">{cat.name}</span>
                       <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                         <Trash2 size={16} />
                       </button>
                     </div>
                   ))}
                 </div>
               </div>

               {/* Coluna Produtos */}
               <div className="lg:col-span-8 bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 min-h-[500px]">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Package className="text-secondary" /> Produtos da Loja
                    </h2>
                    <button onClick={() => setShowProductForm(true)} className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs flex items-center gap-2">
                      <Plus size={16} /> Novo Produto
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {storeProducts.length === 0 ? (
                      <div className="col-span-full py-20 text-center text-slate-300 italic">Nenhum produto cadastrado nesta loja.</div>
                    ) : storeProducts.map(prod => (
                      <div key={prod.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 group">
                        <img src={prod.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 truncate">{prod.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{prod.category}</p>
                          <p className="text-sm font-bold text-secondary">R$ {prod.price.toFixed(2)}</p>
                        </div>
                        <button onClick={() => handleDeleteProduct(prod.id)} className="p-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
               </div>
             </div>
           )}
        </div>

        {/* Modal Novo Produto Manual */}
        {showProductForm && (
          <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl animate-scale-up overflow-hidden">
               <div className="p-8 border-b bg-slate-50 flex items-center justify-between">
                 <h3 className="text-2xl font-bold text-slate-800">Novo Produto</h3>
                 <button onClick={() => setShowProductForm(false)} className="text-slate-300 hover:text-slate-500"><X /></button>
               </div>
               <form onSubmit={handleSaveProduct} className="p-8 space-y-4">
                 <div className="flex gap-4 items-center mb-4">
                    <div 
                      onClick={() => productImgInputRef.current?.click()}
                      className="w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
                    >
                      {productFormData.imageUrl ? <img src={productFormData.imageUrl} className="w-full h-full object-cover" /> : <Camera className="text-slate-300" />}
                      <input type="file" ref={productImgInputRef} onChange={(e) => handleFileChange(e, 'product')} className="hidden" accept="image/*" />
                    </div>
                    <div className="flex-1 space-y-4">
                       <input required type="text" placeholder="Nome do Produto" value={productFormData.name} onChange={e => setProductFormData({...productFormData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border border-slate-100 font-bold" />
                       <input required type="number" step="0.01" placeholder="Preço (R$)" value={productFormData.price || ''} onChange={e => setProductFormData({...productFormData, price: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border border-slate-100 font-bold" />
                    </div>
                 </div>
                 <div className="space-y-4">
                   <textarea placeholder="Descrição curta..." value={productFormData.description} onChange={e => setProductFormData({...productFormData, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border border-slate-100 h-24 resize-none font-medium" />
                   <select required value={productFormData.category} onChange={e => setProductFormData({...productFormData, category: e.target.value})} className="w-full px-4 py-4 bg-slate-50 rounded-xl outline-none border border-slate-100 font-bold">
                     <option value="">Selecione a Categoria</option>
                     {storeCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                   </select>
                 </div>
                 <div className="pt-6 flex gap-4">
                   <button type="button" onClick={() => setShowProductForm(false)} className="flex-1 font-bold text-slate-400">Cancelar</button>
                   <button type="submit" className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold shadow-xl">Salvar Produto</button>
                 </div>
               </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-900 font-sans">
      <nav className="bg-[#001F3F] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary rounded-xl text-primary">
            <ShieldCheck size={24} />
          </div>
          <span className="font-brand font-bold text-xl tracking-tight">Master Control <span className="text-secondary font-sans text-[10px] uppercase ml-2 bg-white/10 px-2 py-0.5 rounded">v2.3</span></span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-brand font-bold text-slate-800">Lojas Gerenciadas</h1>
            <p className="text-slate-500 font-medium">Controle total sobre clientes, status e inventários.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-10 py-5 bg-[#001F3F] text-white font-bold rounded-[1.5rem] shadow-2xl hover:bg-black transition-all active:scale-95 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" /> Criar Novo Cliente
          </button>
        </div>

        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou slug..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-8 py-6 bg-white rounded-[2rem] border-none outline-none focus:ring-4 focus:ring-[#001F3F]/5 shadow-xl transition-all font-medium text-lg"
          />
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[#001F3F]" size={64} />
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">Nenhuma loja ativa no sistema.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredStores.map(store => (
              <div key={store.id} className={`bg-white rounded-[3rem] p-8 border-2 transition-all flex flex-col hover:shadow-2xl relative group ${!store.isActive ? 'border-red-100 bg-red-50/20 grayscale' : 'border-white hover:border-secondary shadow-xl'}`}>
                
                {!store.isActive && (
                   <div className="absolute top-6 right-8 bg-red-500 text-white text-[8px] font-black px-3 py-1.5 rounded-full uppercase z-10">SUSPENSA</div>
                )}

                <div className="flex items-center gap-5 mb-8">
                  <img src={store.logoUrl} className={`w-20 h-20 rounded-[1.5rem] object-cover border-4 ${store.isActive ? 'border-secondary' : 'border-slate-200'}`} />
                  <div className="min-w-0">
                    <h3 className="font-bold text-2xl text-slate-800 truncate">{store.name}</h3>
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">/{store.slug}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => handleManageContent(store)} className="flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-200 transition-all">
                    <Edit2 size={14} /> Gerenciar Loja
                  </button>
                  <button 
                    onClick={() => toggleStoreStatus(store.id, store.isActive)}
                    className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${store.isActive ? 'bg-red-50 text-red-600' : 'bg-green-600 text-white'}`}
                  >
                    {store.isActive ? <Lock size={14} /> : <Unlock size={14} />} {store.isActive ? 'Bloquear' : 'Reativar'}
                  </button>
                  <a href={`/#/login?loja=${store.slug}`} target="_blank" className="flex items-center justify-center gap-2 py-4 bg-secondary text-primary rounded-2xl font-black text-[10px] uppercase col-span-2">
                    <LayoutDashboard size={14} /> Acessar Painel ADM
                  </a>
                  <a href={`/#/cardapio?loja=${store.slug}`} target="_blank" className="flex items-center justify-center gap-2 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase col-span-2">
                    <ArrowUpRight size={14} /> Ver Cardápio Público
                  </a>
                  <button 
                    onClick={() => copyLink(store.slug)}
                    className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-400 rounded-xl font-black text-[8px] uppercase col-span-2 mt-2"
                  >
                    {copiedId === store.slug ? <Check size={12} className="text-green-500" /> : <Copy size={12} />} {copiedId === store.slug ? 'Link Copiado' : 'Copiar Link do Cardápio'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl animate-scale-up overflow-hidden">
            <div className="p-10 border-b bg-slate-50 flex items-center justify-between">
              <h2 className="text-3xl font-brand font-bold text-slate-800">Novo Cliente</h2>
              <button onClick={() => setShowModal(false)} className="p-4 text-slate-300 hover:text-slate-500"><X size={32}/></button>
            </div>
            
            <form onSubmit={handleCreateStore} className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome da Loja</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-5 bg-slate-50 rounded-[1.8rem] outline-none font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Slug</label>
                  <input type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} className="w-full px-6 py-5 bg-slate-50 rounded-[1.8rem] outline-none font-bold" placeholder="ex: unidade-sul" />
                </div>
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Logo (Upload)</label>
                  <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 bg-slate-50 rounded-[1.8rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer relative overflow-hidden">
                    {formData.logoUrl ? <img src={formData.logoUrl} className="w-full h-full object-cover" /> : <Camera className="text-slate-300" />}
                    <input type="file" ref={fileInputRef} onChange={e => handleFileChange(e, 'store')} className="hidden" accept="image/*" />
                  </div>
              </div>
              <div className="pt-8 flex gap-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-bold">Cancelar</button>
                <button disabled={isSaving} type="submit" className="flex-[2] py-5 bg-[#001F3F] text-white rounded-[1.8rem] font-bold shadow-2xl">
                  {isSaving ? <Loader2 className="animate-spin mx-auto" size={24}/> : 'Cadastrar Loja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
