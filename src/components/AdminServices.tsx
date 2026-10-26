import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Clock, 
  X, 
  TrendingUp,
  Loader2,
  Pencil,
  AlertTriangle
} from 'lucide-react';
import { Service, AdditionalService } from '../types';
import { StructuredText } from './StructuredText';
import { 
  listAllServices, 
  createService, 
  createAdditionalService 
} from '../services/serviceAPI';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const AdminServices: React.FC = () => {
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);

  // Editing states
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingUpsell, setEditingUpsell] = useState<AdditionalService | null>(null);

  // Deletion confirmation states
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [upsellToDelete, setUpsellToDelete] = useState<AdditionalService | null>(null);

  // Firestore DB States
  const [services, setServices] = useState<Service[]>([]);
  const [upsells, setUpsells] = useState<AdditionalService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingService, setIsSavingService] = useState(false);
  const [isSavingUpsell, setIsSavingUpsell] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form States for Service
  const [srvName, setSrvName] = useState('');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvPrice, setSrvPrice] = useState('');
  const [srvImg, setSrvImg] = useState('');
  const [srvVideo, setSrvVideo] = useState('');
  const [srvDuration, setSrvDuration] = useState('');
  const [srvPreparation, setSrvPreparation] = useState('');

  // Form States for Upsell
  const [upsName, setUpsName] = useState('');
  const [upsPrice, setUpsPrice] = useState('');
  const [upsDuration, setUpsDuration] = useState('');

  // Fetch Services & Upsells on Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Fetch massage services
        const fetchedServices = await listAllServices();
        setServices(fetchedServices);

        // 2. Fetch additional services (upsells)
        const upsellsRef = collection(db, 'additional_services');
        const upsSnapshot = await getDocs(upsellsRef);
        const fetchedUpsells: AdditionalService[] = [];
        upsSnapshot.forEach((docSnap) => {
          fetchedUpsells.push(docSnap.data() as AdditionalService);
        });
        setUpsells(fetchedUpsells);

      } catch (err: any) {
        console.error('Error loading admin services:', err);
        setError('Falha ao carregar os dados de serviços e adicionais do Firestore.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const startCreateService = () => {
    setEditingService(null);
    setSrvName('');
    setSrvDesc('');
    setSrvPrice('');
    setSrvImg('');
    setSrvVideo('');
    setSrvDuration('');
    setSrvPreparation('');
    setIsServiceModalOpen(true);
  };

  const startEditService = (srv: Service) => {
    setEditingService(srv);
    setSrvName(srv.name);
    setSrvDesc(srv.description);
    setSrvPrice((srv.price / 100).toFixed(2).replace('.', ','));
    setSrvImg(srv.imageUrl || '');
    setSrvVideo(srv.videoUrl || '');
    setSrvDuration(srv.durationMinutes.toString());
    setSrvPreparation(srv.preparationMinutes.toString());
    setIsServiceModalOpen(true);
  };

  const startCreateUpsell = () => {
    setEditingUpsell(null);
    setUpsName('');
    setUpsPrice('');
    setUpsDuration('');
    setIsUpsellModalOpen(true);
  };

  const startEditUpsell = (ups: AdditionalService) => {
    setEditingUpsell(ups);
    setUpsName(ups.name);
    setUpsPrice((ups.price / 100).toFixed(2).replace('.', ','));
    setUpsDuration(ups.durationMinutes.toString());
    setIsUpsellModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingService) return;

    try {
      setIsSavingService(true);
      setError(null);
      
      const priceCents = Math.round(parseFloat(srvPrice.replace(',', '.')) * 100);
      
      const serviceData = {
        name: srvName,
        description: srvDesc,
        price: priceCents || 0,
        durationMinutes: parseInt(srvDuration) || 60,
        preparationMinutes: parseInt(srvPreparation) || 15,
        imageUrl: srvImg || 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=300',
        videoUrl: srvVideo || "",
      };

      if (editingService) {
        // Update document
        const serviceDocRef = doc(db, 'services', editingService.id);
        await updateDoc(serviceDocRef, {
          ...serviceData,
          updatedAt: new Date()
        });

        setServices((prev) => 
          prev.map((s) => s.id === editingService.id ? { ...s, ...serviceData } : s)
        );
      } else {
        // Create document
        const newServicePayload: Omit<Service, 'id' | 'createdAt' | 'updatedAt'> = {
          ...serviceData,
          isActive: true
        };

        const generatedId = await createService(newServicePayload);

        const createdService: Service = {
          ...newServicePayload,
          id: generatedId,
          createdAt: null,
          updatedAt: null,
        };

        setServices((prev) => [...prev, createdService]);
      }

      setIsServiceModalOpen(false);
      setEditingService(null);

      // Reset Form
      setSrvName('');
      setSrvDesc('');
      setSrvPrice('');
      setSrvImg('');
      setSrvVideo('');
      setSrvDuration('');
      setSrvPreparation('');
    } catch (err: any) {
      console.error('Error saving service:', err);
      setError('Erro ao salvar o serviço no Firebase.');
    } finally {
      setIsSavingService(false);
    }
  };

  const handleSaveUpsell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingUpsell) return;

    try {
      setIsSavingUpsell(true);
      setError(null);

      const priceCents = Math.round(parseFloat(upsPrice.replace(',', '.')) * 100);

      const upsellData = {
        name: upsName,
        price: priceCents || 0,
        durationMinutes: parseInt(upsDuration) || 15,
      };

      if (editingUpsell) {
        // Update document
        const upsellDocRef = doc(db, 'additional_services', editingUpsell.id);
        await updateDoc(upsellDocRef, {
          ...upsellData,
          updatedAt: new Date()
        });

        setUpsells((prev) => 
          prev.map((u) => u.id === editingUpsell.id ? { ...u, ...upsellData } : u)
        );
      } else {
        // Create document
        const newUpsellPayload: Omit<AdditionalService, 'id' | 'createdAt' | 'updatedAt'> = {
          ...upsellData,
          description: 'Serviço adicional premium.',
          isActive: true,
        };

        const generatedId = await createAdditionalService(newUpsellPayload);

        const createdUpsell: AdditionalService = {
          ...newUpsellPayload,
          id: generatedId,
          createdAt: null,
          updatedAt: null,
        };

        setUpsells((prev) => [...prev, createdUpsell]);
      }

      setIsUpsellModalOpen(false);
      setEditingUpsell(null);

      // Reset Form
      setUpsName('');
      setUpsPrice('');
      setUpsDuration('');
    } catch (err: any) {
      console.error('Error saving upsell:', err);
      setError('Erro ao salvar o adicional no Firebase.');
    } finally {
      setIsSavingUpsell(false);
    }
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      await deleteDoc(doc(db, 'services', serviceToDelete.id));
      setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      setServiceToDelete(null);
    } catch (err: any) {
      console.error('Error deleting service:', err);
      setError('Erro ao excluir serviço do Firebase: ' + err.message);
    }
  };

  const confirmDeleteUpsell = async () => {
    if (!upsellToDelete) return;

    try {
      await deleteDoc(doc(db, 'additional_services', upsellToDelete.id));
      setUpsells((prev) => prev.filter((u) => u.id !== upsellToDelete.id));
      setUpsellToDelete(null);
    } catch (err: any) {
      console.error('Error deleting upsell:', err);
      setError('Erro ao excluir adicional do Firebase: ' + err.message);
    }
  };

  const renderFormattedDescription = (text: string) => {
    if (!text) return null;
    const normalized = text
      .replace(/<strong>/g, '**')
      .replace(/<\/strong>/g, '**');

    const parts = normalized.split('**');
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return (
          <strong key={idx} className="text-[#D4AF37] font-bold">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        <span className="text-sm font-sans tracking-widest text-zinc-500 uppercase">Carregando experiências do Spa...</span>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {error && (
        <div className="bg-red-950/40 border border-red-900 rounded-lg p-4 text-xs font-sans text-red-200">
          {error}
        </div>
      )}

      {/* SECTION 1: CORE SERVICES */}
      <section id="admin-core-services-section" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-[#D4AF37] tracking-[0.2em] uppercase block mb-1">Gestão de Experiências</span>
            <h2 className="text-2xl font-light text-white font-serif-luxury tracking-wide">Serviços e Massagens</h2>
          </div>
          <button
            onClick={startCreateService}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/15 transition-all duration-300"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Serviço</span>
          </button>
        </div>

        {/* Services Grid */}
        {services.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 text-center text-zinc-500 text-sm font-sans">
            Nenhum serviço de massagem cadastrado. Toque em "Novo Serviço" para começar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((srv) => (
              <div 
                key={srv.id} 
                className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 sm:p-7 flex gap-5 sm:gap-6 hover:border-[#D4AF37]/30 transition-all duration-300 animate-fade-in"
              >
                <div className="h-28 w-24 rounded-lg overflow-hidden shrink-0 border border-zinc-900 bg-zinc-900">
                  <img 
                    src={srv.imageUrl || 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=300'} 
                    alt={srv.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-serif-luxury text-base font-bold text-zinc-100 truncate">{srv.name}</h3>
                    <p className="text-xs text-zinc-400 font-sans mt-1 line-clamp-2 leading-relaxed whitespace-pre-line">
                      {renderFormattedDescription(srv.description)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-900 pt-3 mt-3">
                    <div className="flex items-center gap-3 text-xs text-[#D4AF37] font-sans">
                      <span className="font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(srv.price / 100)}
                      </span>
                      <span className="text-zinc-700">|</span>
                      <span className="flex items-center gap-1 font-semibold text-zinc-300">
                        <Clock className="h-3 w-3 text-[#D4AF37]" /> {srv.durationMinutes} min
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => startEditService(srv)}
                        className="p-1.5 text-zinc-500 hover:text-[#D4AF37] transition-colors"
                        title="Editar Serviço"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setServiceToDelete(srv)}
                        className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"
                        title="Excluir Serviço"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: ADDITIONAL SERVICES (UPSELLS) */}
      <section id="admin-additional-upsells-section" className="border-t border-zinc-900/60 pt-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-[#D4AF37] tracking-[0.2em] uppercase block mb-1">Aumento de Ticket</span>
            <h2 className="text-2xl font-light text-white font-serif-luxury tracking-wide">Serviços Adicionais (Upsells)</h2>
          </div>
          <button
            onClick={startCreateUpsell}
            className="inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/30 bg-zinc-950 hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#D4AF37] transition-all duration-300"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Adicional</span>
          </button>
        </div>

        {/* Upsell Cards list */}
        {upsells.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 text-center text-zinc-500 text-sm font-sans">
            Nenhum serviço adicional de upsell cadastrado. Toque em "Novo Adicional" para começar.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {upsells.map((ups) => (
              <div 
                key={ups.id}
                className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 hover:border-[#D4AF37]/30 transition-all duration-300 flex items-center justify-between animate-fade-in"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span className="text-[10px] font-bold text-zinc-400 font-sans uppercase tracking-widest">Upsell Ativo</span>
                  </div>
                  <h4 className="font-serif-luxury text-sm font-bold text-zinc-200 mt-1">{ups.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-sans mt-2">
                    <span className="font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ups.price / 100)}
                    </span>
                    <span className="text-zinc-700">•</span>
                    <span className="flex items-center gap-1 text-zinc-300 font-medium">
                      +{ups.durationMinutes} min adicionais
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => startEditUpsell(ups)}
                    className="p-2 text-zinc-500 hover:text-[#D4AF37] transition-colors"
                    title="Editar Adicional"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setUpsellToDelete(ups)}
                    className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                    title="Excluir Adicional"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL 1: CORE SERVICE FORM (CREATE/EDIT) */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-xl bg-zinc-950 border border-[#D4AF37]/30 p-6 sm:p-8 shadow-gold-glow my-8">
            <button
              onClick={() => {
                setIsServiceModalOpen(false);
                setEditingService(null);
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-light font-serif-luxury tracking-wide text-white mb-6">
              {editingService ? 'Editar Experiência' : 'Cadastrar Novo Serviço de Massagem'}
            </h3>
            
            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome do Serviço</label>
                <input 
                  type="text" 
                  required 
                  value={srvName}
                  onChange={e => setSrvName(e.target.value)}
                  placeholder="ex: Massagem Imperial de Lótus"
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-650"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Descrição</label>
                <textarea 
                  required 
                  rows={6}
                  value={srvDesc}
                  onChange={e => setSrvDesc(e.target.value)}
                  placeholder="Descreva minuciosamente a experiência sensorial. Suporta quebras de linha/parágrafos, negrito via **texto** ou <strong>texto</strong>, e marcadores com '•' ou '-'."
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-650 min-h-[160px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Valor (R$)</label>
                  <input 
                    type="text" 
                    required 
                    value={srvPrice}
                    onChange={e => setSrvPrice(e.target.value)}
                    placeholder="250,00"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Imagem URL</label>
                  <input 
                    type="url" 
                    value={srvImg}
                    onChange={e => setSrvImg(e.target.value)}
                    placeholder="https://exemplo.com/massagem.jpg"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Duração da Sessão (min)</label>
                  <input 
                    type="number" 
                    required 
                    value={srvDuration}
                    onChange={e => setSrvDuration(e.target.value)}
                    placeholder="60"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Tempo de Preparação (min)</label>
                  <input 
                    type="number" 
                    required 
                    value={srvPreparation}
                    onChange={e => setSrvPreparation(e.target.value)}
                    placeholder="15"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Vídeo Demonstrativo URL (Opcional)</label>
                <input 
                  type="url" 
                  value={srvVideo}
                  onChange={e => setSrvVideo(e.target.value)}
                  placeholder="https://youtube.com/demonstracao"
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingService}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-black shadow-lg shadow-[#D4AF37]/25 hover:from-[#CFB53B] hover:to-[#D4AF37] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingService ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-black" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>{editingService ? 'Salvar Alterações' : 'Salvar Serviço'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPSELL SERVICE FORM (CREATE/EDIT) */}
      {isUpsellModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md rounded-xl bg-zinc-950 border border-[#D4AF37]/30 p-6 sm:p-8 shadow-gold-glow my-8">
            <button
              onClick={() => {
                setIsUpsellModalOpen(false);
                setEditingUpsell(null);
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-light font-serif-luxury tracking-wide text-white mb-6">
              {editingUpsell ? 'Editar Adicional' : 'Adicionar Serviço de Upsell'}
            </h3>
            
            <form onSubmit={handleSaveUpsell} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome do Adicional</label>
                <input 
                  type="text" 
                  required 
                  value={upsName}
                  onChange={e => setUpsName(e.target.value)}
                  placeholder="ex: Máscara Facial de Ouro 24k"
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-650"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Valor Extra (R$)</label>
                  <input 
                    type="text" 
                    required 
                    value={upsPrice}
                    onChange={e => setUpsPrice(e.target.value)}
                    placeholder="75,00"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Tempo Extra (minutos)</label>
                  <input 
                    type="number" 
                    required 
                    value={upsDuration}
                    onChange={e => setUpsDuration(e.target.value)}
                    placeholder="15"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingUpsell}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-black shadow-lg shadow-[#D4AF37]/25 hover:from-[#CFB53B] hover:to-[#D4AF37] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingUpsell ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-black" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>{editingUpsell ? 'Salvar Alterações' : 'Salvar Adicional'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CORE SERVICE CONFIRMATION */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-zinc-950 border border-red-900/50 p-6 sm:p-8 shadow-2xl animate-fade-in text-center">
            <button
              onClick={() => setServiceToDelete(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4 animate-pulse" />
            
            <h3 className="text-lg font-light font-serif-luxury tracking-wide text-white mb-2">
              Confirmar Exclusão de Serviço
            </h3>
            
            <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-sans">
              Tem certeza de que deseja remover o serviço <strong className="text-zinc-200 font-bold">"{serviceToDelete.name}"</strong>? Esta ação não poderá ser revertida.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setServiceToDelete(null)}
                className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-450 hover:bg-zinc-900 transition-all font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteService}
                className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-black bg-gradient-to-r from-red-500 to-rose-600 hover:from-rose-600 hover:to-red-500 shadow-lg shadow-red-950/20 transition-all font-sans"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE UPSELL SERVICE CONFIRMATION */}
      {upsellToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-zinc-950 border border-red-900/50 p-6 sm:p-8 shadow-2xl animate-fade-in text-center">
            <button
              onClick={() => setUpsellToDelete(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4 animate-pulse" />
            
            <h3 className="text-lg font-light font-serif-luxury tracking-wide text-white mb-2">
              Confirmar Exclusão de Adicional
            </h3>
            
            <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-sans">
              Tem certeza de que deseja remover o adicional <strong className="text-zinc-200 font-bold">"{upsellToDelete.name}"</strong>? Esta ação não poderá ser revertida.
            </p>

            <div className="flex gap-3 justify-center font-sans">
              <button
                onClick={() => setUpsellToDelete(null)}
                className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-450 hover:bg-zinc-900 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteUpsell}
                className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-black bg-gradient-to-r from-red-500 to-rose-600 hover:from-rose-600 hover:to-red-500 shadow-lg shadow-red-950/20 transition-all"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
