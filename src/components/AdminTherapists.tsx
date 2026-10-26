import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  X, 
  Users, 
  Mail, 
  Phone, 
  CheckSquare, 
  Square,
  Award,
  Loader2,
  CalendarDays,
  Edit,
  Eye,
  EyeOff,
  Crop
} from 'lucide-react';
import { Therapist, Service } from '../types';
import { listAllServices } from '../services/serviceAPI';
import { getTherapistImageStyle } from '../utils/imageUtils';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { db, firebaseConfig } from '../config/firebase';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

export const AdminTherapists: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing and Deleting States
  const [editingTherapistId, setEditingTherapistId] = useState<string | null>(null);
  const [deletingTherapist, setDeletingTherapist] = useState<Therapist | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [posX, setPosX] = useState<number>(50);
  const [posY, setPosY] = useState<number>(50);
  const [zoom, setZoom] = useState<number>(1);
  const [bio, setBio] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(30);
  const [pagarmeRecipientId, setPagarmeRecipientId] = useState('');

  // Load therapists and services
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all registered services
        const fetchedServices = await listAllServices();
        setServices(fetchedServices);

        // Fetch all therapists from collection
        const therapistsRef = collection(db, 'therapists');
        const querySnapshot = await getDocs(therapistsRef);
        const fetchedTherapists: Therapist[] = [];
        querySnapshot.forEach((docSnap) => {
          fetchedTherapists.push(docSnap.data() as Therapist);
        });
        setTherapists(fetchedTherapists);

      } catch (err: any) {
        console.error('Error loading therapists data:', err);
        setError('Erro ao carregar dados do Firestore.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleToggleSpecialty = (serviceId: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId) 
        : [...prev, serviceId]
    );
  };

  const resetForm = () => {
    setName('');
    setCpf('');
    setPhone('');
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setBirthDate('');
    setAvatarUrl('');
    setPosX(50);
    setPosY(50);
    setZoom(1);
    setBio('');
    setSelectedSpecialties([]);
    setEditingTherapistId(null);
    setCommissionPercentage(30);
    setPagarmeRecipientId('');
  };

  const openEditModal = (therapist: Therapist) => {
    setName(therapist.name);
    setCpf((therapist as any).cpf || '');
    setPhone(therapist.phone);
    setEmail(therapist.email);
    
    // Extract the username part before the @
    const extractedUsername = therapist.email.split('@')[0] || '';
    setUsername(extractedUsername);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    
    setBirthDate((therapist as any).birthDate || '');
    setAvatarUrl(therapist.avatarUrl || '');

    // Parse image position (e.g. '50% 30%')
    if (therapist.imagePosition) {
      const parts = therapist.imagePosition.split(' ');
      if (parts.length === 2) {
        const x = parseInt(parts[0], 10);
        const y = parseInt(parts[1], 10);
        setPosX(!isNaN(x) ? x : 50);
        setPosY(!isNaN(y) ? y : 50);
      } else {
        setPosX(50);
        setPosY(50);
      }
    } else {
      setPosX(50);
      setPosY(50);
    }
    setZoom(therapist.imageZoom || 1);

    setBio(therapist.bio || '');
    setSelectedSpecialties(therapist.specialties || []);
    setEditingTherapistId(therapist.id);
    setCommissionPercentage(therapist.commissionPercentage !== undefined ? therapist.commissionPercentage : 30);
    setPagarmeRecipientId(therapist.pagarmeRecipientId || '');
    setIsModalOpen(true);
  };

  const handleSaveTherapist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    // Build internal standard email from username slug
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!cleanUsername) {
      setError('Por favor, informe um usuário de acesso válido.');
      return;
    }
    const therapistEmail = `${cleanUsername}@spaexperience.com`;

    // Password Double Confirmation and Length Validation
    if (password) {
      if (password.length < 6) {
        setError('A senha deve conter no mínimo 6 caracteres para atender os padrões do Firebase Authentication.');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas digitadas não coincidem. Por favor, verifique a dupla confirmação.');
        return;
      }
    }

    try {
      setIsSaving(true);
      setError(null);

      if (editingTherapistId) {
        // Edit mode
        let activeUid = editingTherapistId;

        // If password is typed on edit, check if we need to provision credentials or register her
        if (password) {
          const secondaryApp = getApps().find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
          const secondaryAuth = getAuth(secondaryApp);
          
          try {
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, therapistEmail, password);
            const newUid = userCredential.user.uid;
            await signOut(secondaryAuth);

            // Since a brand new user account was registered, we migrate/re-save the therapist profile to use the new UID
            // Create user document inside `/users`
            await setDoc(doc(db, 'users', newUid), {
              uid: newUid,
              name,
              email: therapistEmail,
              role: 'therapist',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            // Save therapist profile with new UID document
            const newTherapistPayload = {
              id: newUid,
              name,
              email: therapistEmail,
              phone,
              bio: bio || 'Massoterapeuta certificada e especializada em bem-estar.',
              specialties: selectedSpecialties,
              isActive: true,
              avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200',
              imagePosition: `${posX}% ${posY}%`,
              imageZoom: Number(zoom),
              cpf,
              birthDate,
              commissionPercentage: Number(commissionPercentage),
              pagarmeRecipientId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            await setDoc(doc(db, 'therapists', newUid), newTherapistPayload);

            // If the old ID is different from the new UID, delete the old document to complete migration
            if (editingTherapistId !== newUid) {
              await deleteDoc(doc(db, 'therapists', editingTherapistId));
              
              // Migrate associated appointments so they aren't orphaned
              try {
                const appointmentsRef = collection(db, 'appointments');
                const qApp = query(appointmentsRef, where('therapistId', '==', editingTherapistId));
                const appSnap = await getDocs(qApp);
                const batchPromises = appSnap.docs.map(docSnap => {
                  return updateDoc(doc(db, 'appointments', docSnap.id), {
                    therapistId: newUid,
                    updatedAt: serverTimestamp()
                  });
                });
                await Promise.all(batchPromises);
                console.log(`Migrated ${batchPromises.length} appointments to new therapist UID: ${newUid}`);
              } catch (migrateErr) {
                console.warn('Non-critical appointment migration error:', migrateErr);
              }
            }

            activeUid = newUid;
          } catch (authErr: any) {
            if (authErr.code === 'auth/email-already-in-use') {
              // The Auth account is already active, which is fine!
              // Just perform standard profile updates on the existing document
              console.log('Account already exists, proceeding with profile-only updates.');
            } else {
              throw authErr;
            }
          }
        }

        // Standard profile update (runs if no password was supplied or if account already existed)
        const docRef = doc(db, 'therapists', activeUid);
        const updatedTherapistPayload = {
          id: activeUid,
          name,
          email: therapistEmail,
          phone,
          bio: bio || 'Massoterapeuta certificada e especializada em bem-estar.',
          specialties: selectedSpecialties,
          isActive: true,
          avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200',
          imagePosition: `${posX}% ${posY}%`,
          imageZoom: Number(zoom),
          cpf,
          birthDate,
          commissionPercentage: Number(commissionPercentage),
          pagarmeRecipientId,
          updatedAt: serverTimestamp()
        };

        await setDoc(docRef, updatedTherapistPayload, { merge: true });

        // Update email in corresponding users collection if exists
        try {
          const userDocRef = doc(db, 'users', activeUid);
          await setDoc(userDocRef, {
            name,
            email: therapistEmail,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (uErr) {
          console.warn('Non-critical: Could not update associated user document role/email:', uErr);
        }

        // Local state update
        setTherapists(prev => prev.map(t => t.id === editingTherapistId ? { ...t, ...updatedTherapistPayload, id: activeUid } as unknown as Therapist : t));
      } else {
        // Create mode
        if (!password) {
          setError('A senha de acesso provisória é obrigatória para cadastrar.');
          setIsSaving(false);
          return;
        }

        // 1. Initialize a secondary Firebase App instance to register the therapist without logging out the administrator
        const secondaryApp = getApps().find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
        const secondaryAuth = getAuth(secondaryApp);
        
        let uid = '';
        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, therapistEmail, password);
          uid = userCredential.user.uid;
          await signOut(secondaryAuth); // Sign out of secondary instance immediately
        } catch (authErr: any) {
          console.error('Secondary Auth Creation Error:', authErr);
          if (authErr.code === 'auth/email-already-in-use') {
            throw new Error(`O usuário "${cleanUsername}" já está em uso no sistema. Escolha outro nome de acesso.`);
          }
          throw authErr;
        }

        // 2. Create the User Document inside the `/users` collection with 'therapist' role
        const userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, {
          uid,
          name,
          email: therapistEmail,
          role: 'therapist',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // 3. Create the Therapist Document in `/therapists` collection using the exact same uid
        const therapistDocRef = doc(db, 'therapists', uid);
        const newTherapistPayload = {
          id: uid,
          name,
          email: therapistEmail,
          phone,
          bio: bio || 'Massoterapeuta certificada e especializada em bem-estar.',
          specialties: selectedSpecialties,
          isActive: true,
          avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200',
          imagePosition: `${posX}% ${posY}%`,
          imageZoom: Number(zoom),
          cpf,
          birthDate,
          commissionPercentage: Number(commissionPercentage),
          pagarmeRecipientId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(therapistDocRef, newTherapistPayload);

        // Local state update
        setTherapists(prev => [...prev, newTherapistPayload as unknown as Therapist]);
      }

      setIsModalOpen(false);
      resetForm();

    } catch (err: any) {
      console.error('Error saving therapist:', err);
      setError(err.message || 'Erro ao salvar terapeuta no Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTherapist = async (id: string) => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'therapists', id));
      setTherapists(prev => prev.filter(t => t.id !== id));
      setDeletingTherapist(null);
    } catch (err: any) {
      console.error('Error removing therapist:', err);
      setError('Erro ao excluir profissional do Firestore.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        <span className="text-sm font-sans tracking-widest text-zinc-500 uppercase">Sincronizando Profissionais...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-950/40 border border-red-900 rounded-lg p-4 text-xs font-sans text-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-[#D4AF37] tracking-[0.2em] uppercase block mb-1">Equipe de Bem-Estar</span>
          <h2 className="text-2xl font-light text-white font-serif-luxury tracking-wide">Massoterapeutas</h2>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/15 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Massoterapeuta</span>
        </button>
      </div>

      {therapists.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 text-center text-zinc-500 text-sm font-sans">
          Nenhuma massoterapeuta registrada. Adicione uma profissional para habilitar agendamentos.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {therapists.map((therapist) => (
            <div 
              key={therapist.id}
              className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 flex flex-col justify-between hover:border-[#D4AF37]/40 transition-all duration-300 shadow-lg group relative"
            >
              <div className="space-y-4">
                {/* Header section with compact 1:1 Square Photo (1080x1080 proportion) */}
                <div className="flex items-start gap-4 pb-4 border-b border-zinc-900">
                  {/* 1:1 Square Photo Container */}
                  <div className="relative w-28 h-28 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-md">
                    <img 
                      src={therapist.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400'} 
                      alt={therapist.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={getTherapistImageStyle(therapist)}
                    />
                    
                    {/* Framing Badge */}
                    {(therapist.imagePosition || therapist.imageZoom) && (
                      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center py-0.5 rounded bg-black/80 backdrop-blur-md border border-zinc-800 text-[8px] text-[#D4AF37] font-mono">
                        <span>Recorte 1:1</span>
                      </div>
                    )}
                  </div>

                  {/* Therapist Title & Status */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[9px] text-emerald-400 font-sans font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Ativa</span>
                      </span>
                    </div>

                    <h3 className="font-serif-luxury text-base font-bold text-white truncate group-hover:text-[#D4AF37] transition-colors">{therapist.name}</h3>
                    <p className="text-[10px] text-[#D4AF37] font-sans font-semibold uppercase tracking-wider">Massoterapeuta Especialista</p>
                    
                    <div className="pt-1.5 space-y-1 text-xs text-zinc-300 font-sans">
                      <div className="flex items-center gap-1.5 text-zinc-400 truncate">
                        <Mail className="h-3 w-3 text-[#D4AF37] shrink-0" />
                        <span className="truncate text-[11px]">{therapist.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Phone className="h-3 w-3 text-[#D4AF37] shrink-0" />
                        <span className="text-[11px]">{therapist.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Details & Specialties */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 font-sans bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-900">
                    <div>
                      <span className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-wider block">Comissão</span>
                      <span className="text-white font-semibold font-mono">{therapist.commissionPercentage !== undefined ? therapist.commissionPercentage : 30}%</span>
                    </div>
                    {(therapist as any).cpf && (
                      <div>
                        <span className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-wider block">CPF</span>
                        <span className="text-zinc-200 font-mono text-[10px]">{(therapist as any).cpf}</span>
                      </div>
                    )}
                    {(therapist as any).birthDate && (
                      <div>
                        <span className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-wider block">Nascimento</span>
                        <span className="text-zinc-300 text-[10px]">{new Date((therapist as any).birthDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                    {therapist.pagarmeRecipientId && (
                      <div className="col-span-2">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">Pagar.me Split ID</span>
                        <span className="text-zinc-300 font-mono text-[10px] truncate block" title={therapist.pagarmeRecipientId}>{therapist.pagarmeRecipientId}</span>
                      </div>
                    )}
                  </div>

                  {/* Specialties Display */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">
                      Especialidades Ativas
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {therapist.specialties.length === 0 ? (
                        <span className="text-[10px] text-zinc-600 font-sans">Nenhuma especialidade vinculada.</span>
                      ) : (
                        therapist.specialties.map((specId) => {
                          const srv = services.find(s => s.id === specId);
                          return (
                            <span 
                              key={specId} 
                              className="text-[10px] font-medium bg-[#D4AF37]/5 border border-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full font-sans"
                            >
                              {srv ? srv.name : 'Serviço'}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center gap-3 pt-3 mt-3 border-t border-zinc-900">
                <button
                  onClick={() => openEditModal(therapist)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-[#D4AF37] transition-colors"
                >
                  <Crop className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>Ajustar Foto (1:1) / Editar</span>
                </button>
                <button
                  onClick={() => setDeletingTherapist(therapist)}
                  className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"
                  title="Excluir Profissional"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REGISTRATION & EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-xl bg-zinc-950 border border-[#D4AF37]/30 p-6 sm:p-8 shadow-gold-glow my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-light font-serif-luxury tracking-wide text-white mb-6">
              {editingTherapistId ? 'Editar Dados da Massoterapeuta' : 'Cadastrar Nova Massoterapeuta'}
            </h3>
            
            <form onSubmit={handleSaveTherapist} className="space-y-4 font-sans">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ex: Dr. Amanda Cavalcante"
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">CPF</label>
                  <input 
                    type="text" 
                    required 
                    value={cpf}
                    onChange={e => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Celular / WhatsApp</label>
                  <input 
                    type="tel" 
                    required 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-1">Usuário de Acesso (Login)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required 
                      value={username}
                      onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
                      placeholder="ex: leda.souza"
                      className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 pr-32 text-sm text-zinc-100 placeholder-zinc-750 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono select-none">
                      @spaexperience.com
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-500 mt-1 block">Acesso simplificado: digite apenas o nome de usuário</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Data de Nascimento</label>
                  <input 
                    type="date" 
                    required 
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-1 flex justify-between items-center">
                    <span>{editingTherapistId ? 'Senha de Acesso (Opcional)' : 'Senha de Acesso'}</span>
                    <span className="text-[8px] text-zinc-500 font-mono normal-case font-light">Mín. 6 dígitos</span>
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required={!editingTherapistId}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={editingTherapistId ? "Manter atual" : "••••••"}
                      className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 pr-10 text-sm text-zinc-100 placeholder-zinc-700 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#D4AF37] transition-colors"
                      title={showPassword ? "Esconder Senha" : "Mostrar Senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-1">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required={!!password}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder={editingTherapistId ? "Manter atual" : "••••••"}
                      className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 pr-10 text-sm text-zinc-100 placeholder-zinc-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {editingTherapistId && (
                <p className="text-[9px] text-zinc-500 leading-relaxed bg-zinc-900/30 p-2.5 rounded border border-zinc-900">
                  <span className="text-[#D4AF37] font-semibold uppercase tracking-wider text-[8px] block mb-0.5">Vincular Contas Existentes / Geração Retroativa:</span>
                  Se esta massoterapeuta foi cadastrada anteriormente sem conta de login, digite uma senha provisória de 6 dígitos com confirmação acima para **criar o usuário de acesso imediatamente** e liberar o painel dela no sistema.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-1">Porcentagem de Comissão (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    required 
                    value={commissionPercentage}
                    onChange={e => setCommissionPercentage(Number(e.target.value))}
                    placeholder="ex: 30"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-1">ID de Recebedor Pagar.me</label>
                  <input 
                    type="text" 
                    value={pagarmeRecipientId}
                    onChange={e => setPagarmeRecipientId(e.target.value)}
                    placeholder="ex: re_ckxxxxxxxxxxxxxxxx"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-700 font-mono"
                  />
                  <span className="text-[9px] text-zinc-500 block mt-1">Vincula o split de pagamentos automático Stone Pagar.me</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">URL da Foto de Perfil</label>
                  <input 
                    type="url" 
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    placeholder="https://exemplo.com/foto.jpg"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>

                {/* Framing & Crop Adjustment Tool */}
                {avatarUrl && (
                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest flex items-center gap-1.5">
                        <Crop className="h-3.5 w-3.5" />
                        Ajuste de Recorte Quadrado 1:1 (1080 x 1080)
                      </span>
                      <button
                        type="button"
                        onClick={() => { setPosX(50); setPosY(50); setZoom(1); }}
                        className="text-[10px] text-zinc-400 hover:text-white underline transition-colors"
                      >
                        Restaurar Padrão
                      </button>
                    </div>

                    {/* Live Preview Boxes */}
                    <div className="flex flex-wrap items-center gap-6 justify-center bg-zinc-950 p-4 rounded-lg border border-zinc-900">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[9px] text-zinc-500 uppercase font-mono">Formato Quadrado (1080 x 1080)</span>
                        <div className="h-24 w-24 rounded-xl overflow-hidden border-2 border-[#D4AF37]/60 shadow-md bg-zinc-900 relative">
                          <img 
                            src={avatarUrl} 
                            alt="Preview Quadrado"
                            className="w-full h-full object-cover"
                            style={{
                              objectPosition: `${posX}% ${posY}%`,
                              transform: zoom !== 1 ? `scale(${zoom})` : 'none',
                              transformOrigin: `${posX}% ${posY}%`
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[9px] text-zinc-500 uppercase font-mono">Formato Circular (Avatar)</span>
                        <div className="h-20 w-20 rounded-full overflow-hidden border border-zinc-800 shadow-md bg-zinc-900 relative">
                          <img 
                            src={avatarUrl} 
                            alt="Preview Avatar"
                            className="w-full h-full object-cover"
                            style={{
                              objectPosition: `${posX}% ${posY}%`,
                              transform: zoom !== 1 ? `scale(${zoom})` : 'none',
                              transformOrigin: `${posX}% ${posY}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Interactive Focal Point Clicker (1:1 Square Box) */}
                    <div className="space-y-2">
                      <span className="text-[9px] text-zinc-400 block text-center">
                        Clique na foto para centralizar o enquadramento do rosto:
                      </span>
                      <div className="flex justify-center">
                        <div 
                          className="relative h-48 w-48 rounded-xl overflow-hidden bg-black cursor-crosshair border border-zinc-700 select-none group shadow-inner"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                            const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                            setPosX(Math.max(0, Math.min(100, clickX)));
                            setPosY(Math.max(0, Math.min(100, clickY)));
                          }}
                        >
                          <img 
                            src={avatarUrl} 
                            alt="Click to frame" 
                            className="w-full h-full object-cover pointer-events-none"
                            style={{
                              objectPosition: `${posX}% ${posY}%`,
                              transform: zoom !== 1 ? `scale(${zoom})` : 'none',
                              transformOrigin: `${posX}% ${posY}%`
                            }}
                          />
                          {/* Target Crosshair */}
                          <div 
                            className="absolute w-6 h-6 border-2 border-[#D4AF37] rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
                            style={{ left: `${posX}%`, top: `${posY}%` }}
                          >
                            <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />
                          </div>
                          <span className="absolute bottom-2 right-2 text-[9px] font-mono bg-black/80 px-2 py-0.5 rounded text-zinc-300">
                            X: {posX}% | Y: {posY}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Precision Sliders */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex justify-between">
                          <span>Posição X</span>
                          <span className="font-mono text-[#D4AF37]">{posX}%</span>
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={posX} 
                          onChange={e => setPosX(Number(e.target.value))}
                          className="w-full accent-[#D4AF37] cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex justify-between">
                          <span>Posição Y</span>
                          <span className="font-mono text-[#D4AF37]">{posY}%</span>
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={posY} 
                          onChange={e => setPosY(Number(e.target.value))}
                          className="w-full accent-[#D4AF37] cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex justify-between">
                          <span>Zoom</span>
                          <span className="font-mono text-[#D4AF37]">{Math.round(zoom * 100)}%</span>
                        </label>
                        <input 
                          type="range" 
                          min="1" 
                          max="2.5" 
                          step="0.05"
                          value={zoom} 
                          onChange={e => setZoom(Number(e.target.value))}
                          className="w-full accent-[#D4AF37] cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Quick Alignment Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[9px] text-zinc-500 uppercase font-mono mr-1">Rápido:</span>
                      <button
                        type="button"
                        onClick={() => { setPosX(50); setPosY(20); }}
                        className="px-2 py-1 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                      >
                        Topo / Rosto
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPosX(50); setPosY(50); }}
                        className="px-2 py-1 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                      >
                        Centro
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPosX(25); setPosY(50); }}
                        className="px-2 py-1 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                      >
                        Esquerda
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPosX(75); setPosY(50); }}
                        className="px-2 py-1 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                      >
                        Direita
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Breve Biografia / Perfil Profissional</label>
                <textarea 
                  rows={2}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Especialista em massagem com pedras quentes e drenagem linfática..."
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-600"
                />
              </div>

              {/* Specialties Link Multi-select */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Vincular Especialidades (Serviços Atendidos)</label>
                {services.length === 0 ? (
                  <p className="text-xs text-zinc-500">Nenhum serviço de massagem cadastrado no banco de dados.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-zinc-900/60 border border-zinc-900 p-4 rounded-lg max-h-40 overflow-y-auto">
                    {services.map((srv) => {
                      const isSelected = selectedSpecialties.includes(srv.id);
                      return (
                        <button
                          type="button"
                          key={srv.id}
                          onClick={() => handleToggleSpecialty(srv.id)}
                          className="flex items-center gap-2.5 text-left text-xs text-zinc-300 hover:text-white py-1 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-[#D4AF37] shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-zinc-600 shrink-0" />
                          )}
                          <span className="truncate">{srv.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-black shadow-lg shadow-[#D4AF37]/25 hover:from-[#CFB53B] hover:to-[#D4AF37] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-black" />
                    <span>Salvando Alterações...</span>
                  </>
                ) : (
                  <span>{editingTherapistId ? 'Salvar Alterações' : 'Registrar Massoterapeuta'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE POPUP MODAL */}
      {deletingTherapist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-zinc-950 border border-red-900/40 p-6 sm:p-8 shadow-lg font-sans">
            <h3 className="text-lg font-serif-luxury text-zinc-100 tracking-wide mb-3">Confirmar Exclusão</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Tem certeza de que deseja remover a massoterapeuta <strong className="text-zinc-200">{deletingTherapist.name}</strong>? Esta ação não poderá ser desfeita e pode impactar agendamentos vinculados.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingTherapist(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteTherapist(deletingTherapist.id)}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all shadow-md shadow-red-950/25"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Removendo...</span>
                  </>
                ) : (
                  <span>Sim, Excluir</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
