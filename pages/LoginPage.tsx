
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Lock, 
  LogIn, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  Mail, 
  Smartphone,
  ChefHat,
  UserRound,
  Tv,
  Store,
  ArrowRight,
  Monitor,
  Download,
  Share,
  PlusSquare
} from 'lucide-react';

interface Props {
  onLoginSuccess: (user: any) => void;
}

export default function LoginPage({ onLoginSuccess }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'hub' | 'login'>('hub');
  
  // PWA Install Logic
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    });

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Capturar o store_id atual para restringir o login à unidade correta
      const storeSlug = searchParams.get('loja');
      let currentStoreId = null;
      
      if (storeSlug) {
        const { data: storeData } = await supabase.from('store_profiles').eq('slug', storeSlug).maybeSingle();
        currentStoreId = storeData?.id;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
        store_id: currentStoreId
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        onLoginSuccess({
          id: authData.user.id,
          name: authData.user.email || 'Usuário',
          role: authData.user.role // Utiliza o cargo real retornado do banco
        });
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  const PortalButton = ({ icon: Icon, title, description, to, color }: any) => {
    const loja = searchParams.get('loja');
    const fullTo = loja ? `${to}?loja=${loja}` : to;
    
    return (
      <button 
        onClick={() => navigate(fullTo)}
        className="group flex items-center gap-5 p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-orange-100 transition-all text-left active:scale-95"
      >
        <div className={`p-4 rounded-2xl ${color} text-white shadow-lg shadow-black/5 group-hover:scale-110 transition-transform`}>
          <Icon size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-800 leading-none mb-1">{title}</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{description}</p>
        </div>
        <ArrowRight size={20} className="text-gray-200 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
      </button>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff5e1] p-4 md:p-6 relative overflow-hidden text-zinc-900">
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-orange-500 rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary rounded-full opacity-10 blur-3xl"></div>

      <div className="bg-white/40 backdrop-blur-md w-full max-w-2xl rounded-[3rem] p-2 shadow-2xl relative z-10 border border-white/20">
        <div className="bg-white rounded-[2.8rem] p-6 md:p-12 space-y-8 md:space-y-10">
          
          <div className="text-center">
            <div className="w-20 h-20 bg-primary rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl transform rotate-3 hover:rotate-0 transition-transform duration-500 text-secondary">
              <Store size={40} />
            </div>
            <h1 className="text-2xl md:text-3xl font-brand font-bold text-primary">Portal do Colaborador</h1>
            <p className="text-xs md:text-sm text-gray-400 mt-2 uppercase font-black tracking-widest">Identificação de Unidade</p>
          </div>

          {view === 'hub' ? (
            <div className="space-y-6">
              {/* Botão de Instalação Dinâmico */}
              {isInstallable && (
                <button 
                  onClick={handleInstallClick}
                  className="w-full flex items-center justify-center gap-3 p-4 bg-secondary text-primary rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 animate-bounce mb-2"
                >
                  <Download size={20} />
                  <span>INSTALAR SISTEMA (APP)</span>
                </button>
              )}

              {isIOS && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-2 mb-2">
                  <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest text-center">Instalar no iPhone (iOS)</p>
                  <div className="flex items-center justify-center gap-2 text-[11px] text-blue-700 font-medium">
                    <span>Toque em</span> <Share size={14} /> <span>e depois em</span> <PlusSquare size={14} /> <span>"Tela de Início"</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-scale-up">
                <PortalButton 
                  icon={UserRound} 
                  title="Atendimento" 
                  description="Painel de Mesas" 
                  to="/atendimento" 
                  color="bg-orange-500" 
                />
                <PortalButton 
                  icon={ChefHat} 
                  title="Cozinha" 
                  description="Painel de Produção" 
                  to="/cozinha" 
                  color="bg-blue-600" 
                />
                <PortalButton 
                  icon={Tv} 
                  title="Painel TV" 
                  description="Exibição de Pedidos" 
                  to="/tv" 
                  color="bg-purple-600" 
                />
                <button 
                  onClick={() => setView('login')}
                  className="group flex items-center gap-5 p-6 bg-primary rounded-[2rem] border border-primary/10 shadow-lg text-left active:scale-95"
                >
                  <div className="p-4 rounded-2xl bg-white/10 text-secondary shadow-lg group-hover:scale-110 transition-transform">
                    <ShieldCheck size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white leading-none mb-1">Gerência</h3>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Acesso Administrativo</p>
                  </div>
                  <ArrowRight size={20} className="text-white/20 group-hover:text-secondary group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-scale-up">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm animate-shake">
                  <AlertCircle size={18} />
                  <span className="flex-1 font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-4 tracking-widest">Usuário Administrativo</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-secondary/20 focus:bg-white transition-all text-gray-700 font-medium"
                      placeholder="Nome de usuário"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-4 tracking-widest">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-secondary/20 focus:bg-white transition-all text-gray-700"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-xl shadow-black/10 disabled:opacity-50 group"
                  >
                    {loading ? <Loader2 className="animate-spin" size={24} /> : (
                      <>
                        Entrar no Gerenciamento
                        <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setView('hub')}
                    className="w-full py-4 text-gray-400 font-bold text-xs uppercase tracking-[0.2em]"
                  >
                    Voltar ao Portal
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="pt-6 border-t border-gray-100 text-center space-y-4">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">Setup & Atalhos</p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                <Smartphone size={14} /> Mobile
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                <Monitor size={14} /> Desktop
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                <Tv size={14} /> Smart TV
              </div>
            </div>
            <div className="pt-4">
               <a 
                href="https://wa.me/5585987582159" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold text-secondary hover:text-orange-600 transition-colors"
              >
                SUPORTE TÉCNICO CENTRAL
              </a>
            </div>
          </div>

        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
}
