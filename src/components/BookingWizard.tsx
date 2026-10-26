import React, { useState, useEffect } from 'react';
import { getTherapistImageStyle } from '../utils/imageUtils';
import { 
  Sparkles, 
  Clock, 
  User, 
  Calendar as CalendarIcon, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Loader2, 
  AlertCircle, 
  UserCheck,
  Eye,
  EyeOff,
  CreditCard,
  Copy,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Wallet,
  CalendarCheck
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  serverTimestamp,
  collectionGroup,
  query,
  where
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { Service, AdditionalService, Therapist, Appointment, DaySchedule, BusinessOpeningHours, AppointmentAdditionalService } from '../types';
import { calculateSplit } from '../services/pagarme';

interface BookingWizardProps {
  service: Service;
  therapists: Therapist[];
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

export const BookingWizard: React.FC<BookingWizardProps> = ({ service, therapists, onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>(1);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [userRole, setUserRole] = useState<'client' | 'admin' | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(false);

  // Lists from Firestore
  const [allUpsells, setAllUpsells] = useState<AdditionalService[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [openingHours, setOpeningHours] = useState<DaySchedule[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 State: Upsells
  const [selectedUpsellIds, setSelectedUpsellIds] = useState<string[]>([]);

  // Step 2 State: Therapist Preference
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('any'); // 'any' or specific ID

  // Step 3 State: Date and Time Selector
  const getTodayLocalDate = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
  };
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalDate());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Step 4 Inline Auth State (if not logged in)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regConfirmEmail, setRegConfirmEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Toggle visible passwords
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Step 5 Checkout & Payment States
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [pixCopied, setPixCopied] = useState(false);
  const [pixCountdown, setPixCountdown] = useState(600); // 10 minutes
  
  // Card form states
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState('1');
  const [cardBrand, setCardBrand] = useState<'visa' | 'mastercard' | 'amex' | 'elo' | 'generic'>('generic');

  // Checkout loading and success states
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);

  // Client registration validation
  const isRegisterValid = 
    authTab === 'login' || (
      regName.trim() !== '' &&
      regCpf.trim() !== '' &&
      regPhone.trim() !== '' &&
      regEmail.trim() !== '' &&
      regConfirmEmail.trim() !== '' &&
      regPassword.trim() !== '' &&
      regConfirmPassword.trim() !== '' &&
      regEmail.trim().toLowerCase() === regConfirmEmail.trim().toLowerCase() &&
      regPassword === regConfirmPassword &&
      termsAccepted
    );

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsRoleLoading(true);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data?.role || 'client');
          } else {
            setUserRole('client');
          }
        } catch (err) {
          console.error('Error fetching user role:', err);
          setUserRole('client');
        } finally {
          setIsRoleLoading(false);
        }
      } else {
        setUserRole(null);
        setIsRoleLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Step 5: Countdown timer for Pix Session
  useEffect(() => {
    if (step === 5 && paymentMethod === 'pix' && pixCountdown > 0 && !isPaymentSuccess) {
      const timer = setInterval(() => {
        setPixCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, paymentMethod, pixCountdown, isPaymentSuccess]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Card formatting utilities
  const handleCardNumberChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    let formatted = '';
    for (let i = 0; i < clean.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += clean[i];
    }
    setCardNumber(formatted);

    // Detect card brand
    if (clean.startsWith('4')) {
      setCardBrand('visa');
    } else if (clean.startsWith('5')) {
      setCardBrand('mastercard');
    } else if (clean.startsWith('3')) {
      setCardBrand('amex');
    } else if (clean.startsWith('6')) {
      setCardBrand('elo');
    } else {
      setCardBrand('generic');
    }
  };

  const handleExpiryChange = (val: string) => {
    let clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length > 2) {
      clean = clean.slice(0, 2) + '/' + clean.slice(2);
    }
    setCardExpiry(clean);
  };

  const handleCvvChange = (val: string) => {
    setCardCvv(val.replace(/\D/g, '').slice(0, 4));
  };

  // Fetch all necessary setup from Firestore on load
  useEffect(() => {
    const loadSetupData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Fetch upsell additional services
        const upsSnapshot = await getDocs(collection(db, 'additional_services'));
        const ups: AdditionalService[] = [];
        upsSnapshot.forEach(docSnap => {
          ups.push(docSnap.data() as AdditionalService);
        });
        setAllUpsells(ups.filter(u => u.isActive));

        // 2. Fetch business opening hours
        const configDoc = await getDoc(doc(db, 'config', 'opening_hours'));
        if (configDoc.exists()) {
          const hoursData = configDoc.data() as BusinessOpeningHours;
          if (hoursData.weeklySchedule) {
            setOpeningHours(hoursData.weeklySchedule);
          }
        } else {
          // Robust Fallback opening hours
          const fallbackSchedule: DaySchedule[] = Array.from({ length: 7 }, (_, index) => ({
            dayOfWeek: index,
            isOpen: index !== 0, // Closed on Sundays by default
            intervals: [{ start: '09:00', end: '20:00' }]
          }));
          setOpeningHours(fallbackSchedule);
        }

        // 3. Fetch existing appointments
        const appSnapshot = await getDocs(collection(db, 'appointments'));
        const apps: Appointment[] = [];
        appSnapshot.forEach(docSnap => {
          apps.push(docSnap.data() as Appointment);
        });
        setExistingAppointments(apps.filter(a => a.status !== 'cancelled'));

      } catch (err: any) {
        console.error('Error loading booking wizard configuration:', err);
        setError('Falha ao carregar as configurações de agendamento do Firestore.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSetupData();
  }, []);

  // Helper formatting values
  const formatBRL = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  // Calculations based on choices
  const activeUpsells = allUpsells.filter(u => selectedUpsellIds.includes(u.id));
  const totalDuration = service.durationMinutes + activeUpsells.reduce((sum, u) => sum + u.durationMinutes, 0);
  const totalPriceCents = service.price + activeUpsells.reduce((sum, u) => sum + u.price, 0);

  // Filter therapists qualified for this service
  const qualifiedTherapists = therapists.filter(t => t.isActive && t.specialties.includes(service.id));

  // Determine therapist name for displaying in review step
  const getTherapistDisplayName = () => {
    if (selectedTherapistId === 'any') {
      return 'Sem preferência / Primeira disponível';
    }
    const tObj = therapists.find(t => t.id === selectedTherapistId);
    return tObj ? tObj.name : 'Sem preferência';
  };

  // Convert time string "HH:MM" to minutes from midnight
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Convert minutes from midnight to time string "HH:MM"
  const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Dynamic slot generator checking opening hours and overlaps
  const getAvailableSlots = () => {
    if (openingHours.length === 0) return [];

    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const daySchedule = openingHours.find(d => d.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.isOpen || daySchedule.intervals.length === 0) {
      return []; // Spa closed on this day
    }

    const interval = daySchedule.intervals[0];
    const startMins = timeToMinutes(interval.start);
    const endMins = timeToMinutes(interval.end);

    const slotSizeMinutes = 30; // 30-minute steps
    const securityMargin = 20; // 20-minute clean/sanitize block
    const neededBlockSize = totalDuration + securityMargin;

    const availableSlots: string[] = [];

    // Filter appointments on this specific day
    const dayAppointments = existingAppointments.filter(app => app.date === selectedDate);

    // Loop through all potential start times
    for (let time = startMins; time + totalDuration <= endMins; time += slotSizeMinutes) {
      const slotStart = time;
      const slotEnd = time + neededBlockSize;

      if (selectedTherapistId !== 'any') {
        // Checking specific therapist availability
        const overlaps = dayAppointments.some(app => {
          if (app.therapistId !== selectedTherapistId) return false;
          
          const appStart = app.startTime ? timeToMinutes(app.startTime.split('T')[1]?.substring(0, 5)) : 540;
          const appPrep = app.preparationDuration !== undefined ? app.preparationDuration : 20;
          const appEnd = appStart + app.totalDurationMinutes + appPrep;
          
          return slotStart < appEnd && slotEnd > appStart;
        });

        if (!overlaps) {
          availableSlots.push(minutesToTime(slotStart));
        }
      } else {
        // Checking if ANY qualified therapist is free for this block
        const isAnyTherapistFree = qualifiedTherapists.some(therapist => {
          const overlaps = dayAppointments.some(app => {
            if (app.therapistId !== therapist.id) return false;
            
            const appStart = app.startTime ? timeToMinutes(app.startTime.split('T')[1]?.substring(0, 5)) : 540;
            const appPrep = app.preparationDuration !== undefined ? app.preparationDuration : 20;
            const appEnd = appStart + app.totalDurationMinutes + appPrep;
            
            return slotStart < appEnd && slotEnd > appStart;
          });
          return !overlaps;
        });

        if (isAnyTherapistFree) {
          availableSlots.push(minutesToTime(slotStart));
        }
      }
    }

    return availableSlots;
  };

  const availableSlots = getAvailableSlots();

  // CPF Masking helper
  const handleCpfChange = (value: string) => {
    let clean = value.replace(/\D/g, '');
    if (clean.length > 11) clean = clean.slice(0, 11);
    if (clean.length > 9) {
      clean = clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
    } else if (clean.length > 6) {
      clean = clean.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
    } else if (clean.length > 3) {
      clean = clean.replace(/^(\d{3})(\d{1,3})$/, '$1.$2');
    }
    setRegCpf(clean);
  };

  // Phone Masking helper
  const handlePhoneChange = (value: string) => {
    let clean = value.replace(/\D/g, '');
    if (clean.length > 11) clean = clean.slice(0, 11);
    if (clean.length > 10) {
      clean = clean.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (clean.length > 6) {
      clean = clean.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    } else if (clean.length > 2) {
      clean = clean.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    }
    setRegPhone(clean);
  };

  // Handlers for step transitions
  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (!selectedTime) {
        alert('Por favor, selecione um horário para prosseguir.');
        return;
      }
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  // Handle inline Authentication Flow (if user is logged out)
  const handleInlineAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authTab === 'login') {
        if (!loginEmail || !loginPassword) {
          throw new Error('E-mail e senha são obrigatórios.');
        }
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      } else {
        if (!regName || !regCpf || !regPhone || !regEmail || !regConfirmEmail || !regPassword || !regConfirmPassword) {
          throw new Error('Preencha todos os campos obrigatórios.');
        }
        if (regEmail.trim().toLowerCase() !== regConfirmEmail.trim().toLowerCase()) {
          throw new Error('Os e-mails informados não coincidem.');
        }
        if (regPassword !== regConfirmPassword) {
          throw new Error('As senhas informadas não coincidem.');
        }
        if (!termsAccepted) {
          throw new Error('Você deve aceitar os termos de uso para prosseguir.');
        }

         // Rule: Unique CPF check using collectionGroup('private') and matching the encrypted CPF hash, strictly scoped to clients
         const cleanCpf = regCpf.replace(/\D/g, '');
         if (cleanCpf.length !== 11) {
           throw new Error('CPF inválido. Certifique-se de preencher os 11 dígitos.');
         }
         const encryptedCpfHash = btoa(cleanCpf);
 
         const cpfQuery = query(
           collectionGroup(db, 'private'),
           where('encryptedCpf', '==', encryptedCpfHash)
         );
         const cpfQuerySnapshot = await getDocs(cpfQuery);
         let isDuplicateClientCpf = false;
         
         if (!cpfQuerySnapshot.empty && cpfQuerySnapshot.docs.length > 0) {
           for (const docSnap of cpfQuerySnapshot.docs) {
             const userRef = docSnap.ref.parent.parent;
             if (userRef && userRef.path.startsWith('users/')) {
               const userSnap = await getDoc(userRef);
               if (userSnap.exists()) {
                 const userData = userSnap.data();
                 if (userData?.role === 'client') {
                   isDuplicateClientCpf = true;
                   break;
                 }
               }
             }
           }
         }
 
         if (isDuplicateClientCpf) {
           throw new Error('Este CPF já possui cadastro no Spa. Por favor, acesse a aba \'Entrar\' e faça login.');
         }

        // Create Firebase Auth user
        const credential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
        const uid = credential.user.uid;

        // Save public user doc
        await setDoc(doc(db, 'users', uid), {
          uid,
          name: regName,
          email: regEmail.toLowerCase(),
          role: 'client',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Save private user doc (phone and secure details)
        await setDoc(doc(db, 'users', uid, 'private', 'info'), {
          phone: regPhone,
          encryptedCpf: encryptedCpfHash, // Basic LGPD base64 encoding simulation
        });
      }
    } catch (err: any) {
      console.error('Inline Authentication error:', err);
      if (err.message && err.message.includes('CPF já possui cadastro')) {
        setAuthError(err.message);
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Este e-mail já está cadastrado. Acesse a aba \'Entrar\' para continuar seu agendamento.');
      } else {
        setAuthError(err.message || 'Falha ao autenticar.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Process checkout and save in Firestore collection 'appointments'
  const handleProcessCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    setIsProcessingPayment(true);
    setError(null);

    try {
      // Fetch user's real profile information (including full name, phone and CPF) for strict denormalization
      let finalClientName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Cliente';
      let finalClientPhone = '';
      let finalClientCpf = '';

      try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (userSnap.exists()) {
          finalClientName = userSnap.data()?.name || finalClientName;
        }
        
        const privateSnap = await getDoc(doc(db, 'users', currentUser.uid, 'private', 'info'));
        if (privateSnap.exists()) {
          const pData = privateSnap.data();
          finalClientPhone = pData?.phone || '';
          const encCpf = pData?.encryptedCpf;
          if (encCpf) {
            try {
              const decoded = atob(encCpf);
              if (decoded.length === 11) {
                finalClientCpf = `${decoded.slice(0, 3)}.${decoded.slice(3, 6)}.${decoded.slice(6, 9)}-${decoded.slice(9)}`;
              } else {
                finalClientCpf = decoded;
              }
            } catch (decErr) {
              finalClientCpf = encCpf;
            }
          }
        }
      } catch (profileErr) {
        console.error('Error fetching user profile details for denormalization:', profileErr);
      }

      // Pick a therapist if "Sem preferência / Primeira disponível"
      let finalTherapistId = selectedTherapistId;
      let finalTherapistName = getTherapistDisplayName();

      if (selectedTherapistId === 'any') {
        // Find a therapist who has this specialty and is free
        const dayAppointments = existingAppointments.filter(app => app.date === selectedDate);
        const freeTherapist = qualifiedTherapists.find(therapist => {
          const overlaps = dayAppointments.some(app => {
            if (app.therapistId !== therapist.id) return false;
            
            const appStart = app.startTime ? timeToMinutes(app.startTime.split('T')[1]?.substring(0, 5)) : 540;
            const appPrep = app.preparationDuration !== undefined ? app.preparationDuration : 20;
            const appEnd = appStart + app.totalDurationMinutes + appPrep;
            
            const slotStart = timeToMinutes(selectedTime!);
            const neededBlockSize = totalDuration + 20;
            const slotEnd = slotStart + neededBlockSize;

            return slotStart < appEnd && slotEnd > appStart;
          });
          return !overlaps;
        });

        if (freeTherapist) {
          finalTherapistId = freeTherapist.id;
          finalTherapistName = freeTherapist.name;
        } else if (qualifiedTherapists.length > 0) {
          // Fallback to first qualified therapist
          finalTherapistId = qualifiedTherapists[0].id;
          finalTherapistName = qualifiedTherapists[0].name;
        }
      }

      // Convert HH:MM times to ISO string timestamps
      const startMins = timeToMinutes(selectedTime!);
      const endMins = startMins + totalDuration;
      
      const formatTimeFromMins = (mins: number) => {
        const hh = Math.floor(mins / 60);
        const mm = mins % 60;
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      };

      const finalStartTimeStr = `${selectedDate}T${selectedTime}:00`;
      const finalEndTimeStr = `${selectedDate}T${formatTimeFromMins(endMins)}:00`;

      // Build AppointmentAdditionalService objects
      const finalAdditionals: AppointmentAdditionalService[] = activeUpsells.map(u => ({
        id: u.id,
        name: u.name,
        price: u.price,
        durationMinutes: u.durationMinutes
      }));

      // Simulate a premium delay for processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const chosenTherapist = therapists.find(t => t.id === finalTherapistId);
      const commPercentage = chosenTherapist && chosenTherapist.commissionPercentage !== undefined ? chosenTherapist.commissionPercentage : 30;
      const splitResults = calculateSplit(totalPriceCents, paymentMethod, paymentMethod === 'pix' ? 1 : Number(installments), commPercentage);

      const appointmentRef = doc(collection(db, 'appointments'));
      const newAppointmentPayload: Appointment = {
        id: appointmentRef.id,
        clientId: currentUser.uid,
        clientName: finalClientName,
        clientEmail: currentUser.email || '',
        clientPhone: finalClientPhone,
        clientCpf: finalClientCpf,
        therapistId: finalTherapistId,
        therapistName: finalTherapistName,
        serviceId: service.id,
        serviceName: service.name,
        serviceDuration: service.durationMinutes,
        preparationDuration: service.preparationMinutes || 20,
        additionalServices: finalAdditionals,
        date: selectedDate,
        startTime: finalStartTimeStr,
        endTime: finalEndTimeStr,
        totalDurationMinutes: totalDuration,
        basePrice: service.price,
        additionalPrice: activeUpsells.reduce((sum, u) => sum + u.price, 0),
        totalPrice: totalPriceCents,
        status: 'confirmed', // Confirmed since it is paid immediately
        paymentStatus: 'paid', // Paid via Stone checkout simulation
        pagarmeFee: splitResults.pagarmeFee,
        netAmount: splitResults.netAmount,
        therapistCommissionPercentage: splitResults.therapistCommissionPercentage,
        therapistShare: splitResults.therapistShare,
        spaShare: splitResults.spaShare,
        paymentInstallments: paymentMethod === 'pix' ? 1 : Number(installments),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(appointmentRef, newAppointmentPayload);
      setCreatedAppointment(newAppointmentPayload);
      setIsPaymentSuccess(true);
    } catch (err: any) {
      console.error('Error processing checkout payment:', err);
      setError('Falha ao processar pagamento e registrar o agendamento no Firestore.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getGoogleCalendarLink = (app: Appointment) => {
    if (!app) return '';
    const title = `Spa Experience: ${app.serviceName}`;
    const startStr = app.startTime.replace(/[-:]/g, '').split('.')[0];
    const endStr = app.endTime.replace(/[-:]/g, '').split('.')[0];
    const details = `Sua sessão de bem-estar com a especialista ${app.therapistName} está confirmada.\n\nRitual: ${app.serviceName}\nProfissional: ${app.therapistName}\nLocal: Spa Experience (Refúgio de Bem-Estar)`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl bg-zinc-950 border border-[#D4AF37]/30 overflow-hidden shadow-gold-glow my-8">
        
        {/* HEADER WITH INTEGRATED RESPONSIVE STEPPER & CLOSE BUTTON */}
        <div className="bg-[#0b0b0b] border-b border-zinc-900 px-4 sm:px-6 py-3.5">
          {/* Main Bar: Title on left, Desktop Stepper in center, Close Button on right */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-[#D4AF37] shrink-0" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold text-zinc-300 uppercase tracking-widest font-sans truncate">
                  Funil de Agendamento
                </span>
                <span className="text-[10px] font-bold text-[#D4AF37] sm:hidden whitespace-nowrap">
                  • Passo {step} de 5
                </span>
              </div>
            </div>

            {/* Desktop Stepper (sm and above) */}
            <div className="hidden sm:flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                      step === s
                        ? 'bg-[#D4AF37] text-black font-black scale-110 shadow-md shadow-[#D4AF37]/20 ring-2 ring-[#D4AF37]/30'
                        : step > s
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                    }`}
                  >
                    {step > s ? <Check className="h-3.5 w-3.5" /> : s}
                  </div>
                  {s < 5 && (
                    <ChevronRight className={`h-3 w-3 shrink-0 ${step > s ? 'text-emerald-500/60' : 'text-zinc-700'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Close Button cleanly aligned */}
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-400 hover:text-[#D4AF37] border border-zinc-800 hover:border-[#D4AF37]/30 transition-all duration-300 cursor-pointer"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Mobile Stepper Row (Below sm): 100% visible, perfectly centered with steps & arrows, zero clipping */}
          <div className="flex sm:hidden items-center justify-between pt-2.5 mt-2.5 border-t border-zinc-900/80 px-2">
            {[
              { num: 1, label: 'Extras' },
              { num: 2, label: 'Terapeuta' },
              { num: 3, label: 'Horário' },
              { num: 4, label: 'Acesso' },
              { num: 5, label: 'Pagar' },
            ].map(({ num, label }, idx) => (
              <React.Fragment key={num}>
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                      step === num
                        ? 'bg-[#D4AF37] text-black font-black scale-110 shadow-md shadow-[#D4AF37]/30 ring-2 ring-[#D4AF37]/40'
                        : step > num
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                    }`}
                  >
                    {step > num ? <Check className="h-3 w-3" /> : num}
                  </div>
                  <span
                    className={`text-[8px] font-semibold tracking-tight ${
                      step === num
                        ? 'text-[#D4AF37]'
                        : step > num
                        ? 'text-emerald-400/80'
                        : 'text-zinc-600'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < 4 && (
                  <ChevronRight
                    className={`h-3 w-3 mb-2 shrink-0 ${
                      step > num ? 'text-emerald-500/60' : 'text-zinc-700'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900/60 p-4 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-zinc-400 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-[#D4AF37]" />
            <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Iniciando Experiência do Cliente...</span>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">

            {/* STEP 1: CUSTOMIZE SESSIONS (UPSELL) */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-zinc-900 pb-3">
                  <h3 className="text-lg font-light text-white font-serif-luxury tracking-wide">
                    Personalize sua Experiência
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Adicione rituais de bem-estar complementares para elevar o seu relaxamento.</p>
                </div>

                {/* Base Service Box Info */}
                <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest block">Serviço Base Escolhido</span>
                    <h4 className="text-sm font-bold text-white mt-1">{service.name}</h4>
                    <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mt-1">
                      <Clock className="h-3.5 w-3.5 text-zinc-500" /> {service.durationMinutes} minutos de terapia
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-500 block">Preço Base</span>
                    <strong className="text-lg font-bold text-white font-mono">{formatBRL(service.price)}</strong>
                  </div>
                </div>

                {/* Upsells List Choices */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Upgrades de Sessão Premium</span>
                  
                  {allUpsells.length === 0 ? (
                    <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/10 text-center text-xs text-zinc-500 italic">
                      Nenhum upgrade disponível no momento. Prossiga para a escolha da terapeuta.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {allUpsells.map((upsell) => {
                        const isSelected = selectedUpsellIds.includes(upsell.id);
                        return (
                          <div 
                            key={upsell.id}
                            onClick={() => {
                              setSelectedUpsellIds(prev => 
                                isSelected ? prev.filter(id => id !== upsell.id) : [...prev, upsell.id]
                              );
                            }}
                            className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer flex justify-between items-center select-none ${
                              isSelected 
                                ? 'bg-[#D4AF37]/5 border-[#D4AF37] shadow-md shadow-[#D4AF37]/5' 
                                : 'bg-zinc-900/20 border-zinc-900 hover:border-zinc-800'
                            }`}
                          >
                            <div className="space-y-1 pr-4 min-w-0">
                              <span className="text-xs font-bold text-white block truncate">{upsell.name}</span>
                              <span className="text-[10px] text-zinc-400 block font-medium">+{upsell.durationMinutes} min de bem-estar extra</span>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-3">
                              <span className="text-xs font-extrabold text-[#D4AF37] font-mono">{formatBRL(upsell.price)}</span>
                              <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all ${
                                isSelected ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'border-zinc-800 bg-zinc-950'
                              }`}>
                                {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: SELECT THERAPIST */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-zinc-900 pb-3">
                  <h3 className="text-lg font-light text-white font-serif-luxury tracking-wide">
                    Escolha sua Massoterapeuta
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Nossas profissionais são formadas internacionalmente para garantir a excelência técnica.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  
                  {/* Default Preference Option */}
                  <div 
                    onClick={() => setSelectedTherapistId('any')}
                    className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer text-center flex flex-col justify-center items-center gap-3 select-none h-full ${
                      selectedTherapistId === 'any'
                        ? 'bg-[#D4AF37]/5 border-[#D4AF37] shadow-md shadow-[#D4AF37]/5'
                        : 'bg-zinc-900/20 border-zinc-900 hover:border-zinc-800'
                    }`}
                  >
                    <div className="h-14 w-14 rounded-full border border-dashed border-[#D4AF37]/50 flex items-center justify-center bg-zinc-950 text-[#D4AF37] shadow-inner shrink-0">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Qualquer Profissional</h4>
                      <p className="text-[10px] text-zinc-500 mt-1">Busca a primeira agenda livre para acelerar sua sessão.</p>
                    </div>
                  </div>

                  {/* Qualified Therapists Choice */}
                  {qualifiedTherapists.map((therapist) => {
                    const isSelected = selectedTherapistId === therapist.id;
                    return (
                      <div 
                        key={therapist.id}
                        onClick={() => setSelectedTherapistId(therapist.id)}
                        className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col items-center text-center gap-3 select-none h-full ${
                          isSelected
                            ? 'bg-[#D4AF37]/5 border-[#D4AF37] shadow-md shadow-[#D4AF37]/5'
                            : 'bg-zinc-900/20 border-zinc-900 hover:border-zinc-800'
                        }`}
                      >
                        <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-[#D4AF37]/50 bg-zinc-950 shrink-0 shadow-lg shadow-[#D4AF37]/10 transition-transform duration-300 group-hover:scale-105">
                          <img 
                            src={therapist.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300'} 
                            alt={therapist.name} 
                            className="h-full w-full object-cover"
                            style={getTherapistImageStyle(therapist)}
                          />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-white truncate max-w-[150px]">{therapist.name}</h4>
                          <span className="text-[9px] font-bold text-[#D4AF37] tracking-widest uppercase block mt-1">Especialista</span>
                          <p className="text-[9px] text-zinc-500 mt-2 line-clamp-2 leading-relaxed font-medium px-1">
                            {therapist.bio || 'Formada em terapias integrativas e relaxamento extremo.'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: DATE & TIME SMART SLOT PICKER */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-zinc-900 pb-3">
                  <h3 className="text-lg font-light text-white font-serif-luxury tracking-wide">
                    Escolha de Data e Horário
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">A grade horária filtra apenas períodos verdadeiramente livres para evitar conflito na agenda.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  
                  {/* Left block: Date selector input */}
                  <div className="md:col-span-2 space-y-3.5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Selecione o Dia</span>
                    <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-4 flex flex-col space-y-2">
                      <div className="flex items-center gap-2.5 text-[#D4AF37] mb-1.5">
                        <CalendarIcon className="h-4.5 w-4.5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Escolher Calendário</span>
                      </div>
                      <input 
                        type="date" 
                        min={getTodayLocalDate()}
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          setSelectedTime(null); // Reset time selection on date change
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-2.5 text-xs text-zinc-100 font-bold tracking-wide cursor-pointer"
                      />
                      <span className="text-[9px] text-zinc-500 font-medium leading-relaxed block pt-1.5">
                        * As massagens requerem planejamento prévio e as vagas fecham de forma autônoma.
                      </span>
                    </div>
                  </div>

                  {/* Right block: Smart Slots Grade */}
                  <div className="md:col-span-3 space-y-3.5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Horários Disponíveis</span>
                    
                    {availableSlots.length === 0 ? (
                      <div className="bg-zinc-900/10 border border-zinc-900 rounded-xl p-8 text-center text-xs text-zinc-500 italic h-44 flex flex-col justify-center items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-zinc-600" />
                        <span>Não há vagas disponíveis para a data ou terapeuta selecionados. Escolha outro dia.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[190px] overflow-y-auto pr-1">
                        {availableSlots.map((timeSlot) => {
                          const isSelected = selectedTime === timeSlot;
                          return (
                            <button
                              key={timeSlot}
                              onClick={() => setSelectedTime(timeSlot)}
                              className={`py-2 px-3 text-xs font-bold font-mono rounded-lg border tracking-wide transition-all duration-300 ${
                                isSelected
                                  ? 'bg-[#D4AF37] border-[#D4AF37] text-zinc-950 font-black shadow-md shadow-[#D4AF37]/15 scale-[1.03]'
                                  : 'bg-zinc-900/30 border-zinc-900 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37]'
                              }`}
                            >
                              {timeSlot}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & CONFIRM (WITH INLINE AUTHENTICATION CHECK) */}
            {step === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-zinc-900 pb-3">
                  <h3 className="text-lg font-light text-white font-serif-luxury tracking-wide">
                    Confirmação e Reserva
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Revise minuciosamente os detalhes de sua sessão antes de consolidar a reserva.</p>
                </div>

                {/* Left Summary Box + Right Auth form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Summary Review Block */}
                  <div className="md:col-span-6 bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 space-y-4">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block border-b border-zinc-900 pb-1.5">
                      Resumo da Sessão
                    </span>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[8px] text-zinc-500 uppercase tracking-widest block">Serviço Base</span>
                        <h4 className="text-xs font-bold text-white mt-0.5">{service.name}</h4>
                      </div>

                      {activeUpsells.length > 0 && (
                        <div>
                          <span className="text-[8px] text-zinc-500 uppercase tracking-widest block">Adicionais de Ritual</span>
                          <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed font-semibold">
                            {activeUpsells.map(u => u.name).join(', ')}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3.5 pt-1.5 border-t border-zinc-900/80">
                        <div>
                          <span className="text-[8px] text-zinc-500 uppercase tracking-widest block">Profissional</span>
                          <span className="text-xs font-bold text-zinc-300 mt-0.5 block truncate">
                            {getTherapistDisplayName()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-zinc-500 uppercase tracking-widest block">Data &amp; Horário</span>
                          <span className="text-xs font-bold text-zinc-300 mt-0.5 block font-mono">
                            {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5 pt-1.5 border-t border-zinc-900/80">
                        <div>
                          <span className="text-[8px] text-zinc-500 uppercase tracking-widest block">Duração Total</span>
                          <span className="text-xs font-bold text-zinc-300 mt-0.5 block font-mono">
                            {totalDuration} minutos
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-[#D4AF37] uppercase tracking-widest block font-bold">Investimento Final</span>
                          <strong className="text-sm font-bold text-[#D4AF37] mt-0.5 block font-mono">
                            {formatBRL(totalPriceCents)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auth Checking or Confirm Block */}
                  <div className="md:col-span-6 space-y-4">
                    {!currentUser ? (
                      /* CUSTOM INLINE AUTH FORM */
                      <div className="border border-[#D4AF37]/20 rounded-xl bg-zinc-950 p-5 space-y-4 shadow-xl">
                        <div className="flex border-b border-zinc-900">
                          <button
                            type="button"
                            onClick={() => {
                              setAuthTab('login');
                              setAuthError(null);
                            }}
                            className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-widest transition-all relative ${
                              authTab === 'login' ? 'text-[#D4AF37]' : 'text-zinc-500'
                            }`}
                          >
                            Entrar
                            {authTab === 'login' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37]" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAuthTab('register');
                              setAuthError(null);
                            }}
                            className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-widest transition-all relative ${
                              authTab === 'register' ? 'text-[#D4AF37]' : 'text-zinc-500'
                            }`}
                          >
                            Cadastrar
                            {authTab === 'register' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37]" />}
                          </button>
                        </div>

                        {authError && (
                          <div className="bg-red-950/40 border border-red-900/60 p-3 rounded-lg text-[10px] text-red-300 leading-relaxed font-sans">
                            <p>{authError}</p>
                            {authError.includes('CPF já possui cadastro') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAuthTab('login');
                                  setAuthError(null);
                                }}
                                className="mt-2.5 block w-full text-center py-2 rounded-lg bg-[#D4AF37] text-black text-[9px] font-bold uppercase tracking-widest hover:bg-opacity-90 active:scale-[0.98] transition-all"
                              >
                                Ir para a aba "Entrar"
                              </button>
                            )}
                          </div>
                        )}

                        <form onSubmit={handleInlineAuthSubmit} className="space-y-3">
                          {authTab === 'login' ? (
                            <>
                              <div>
                                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">E-mail</label>
                                <input 
                                  type="email" 
                                  required
                                  value={loginEmail}
                                  onChange={e => setLoginEmail(e.target.value)}
                                  placeholder="seu@email.com"
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-250"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Senha</label>
                                <div className="relative">
                                  <input 
                                    type={showLoginPassword ? "text" : "password"} 
                                    required
                                    value={loginPassword}
                                    onChange={e => setLoginPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 pr-10 text-xs text-zinc-250"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#D4AF37] transition-colors"
                                  >
                                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="space-y-3 max-h-[330px] overflow-y-auto pr-1.5 custom-scrollbar">
                              <div>
                                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome Completo</label>
                                <input 
                                  type="text" 
                                  required
                                  value={regName}
                                  onChange={e => setRegName(e.target.value)}
                                  placeholder="Nome e Sobrenome"
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-250"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">CPF</label>
                                  <input 
                                    type="text" 
                                    required
                                    value={regCpf}
                                    onChange={e => handleCpfChange(e.target.value)}
                                    placeholder="000.000.000-00"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-250"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Telefone</label>
                                  <input 
                                    type="tel" 
                                    required
                                    value={regPhone}
                                    onChange={e => handlePhoneChange(e.target.value)}
                                    placeholder="(11) 99999-9999"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-250"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">E-mail</label>
                                  <input 
                                    type="email" 
                                    required
                                    value={regEmail}
                                    onChange={e => setRegEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-250"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Confirmar E-mail</label>
                                  <input 
                                    type="email" 
                                    required
                                    value={regConfirmEmail}
                                    onChange={e => setRegConfirmEmail(e.target.value)}
                                    placeholder="Confirme seu e-mail"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-250"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Senha</label>
                                  <div className="relative">
                                    <input 
                                      type={showRegPassword ? "text" : "password"} 
                                      required
                                      value={regPassword}
                                      onChange={e => setRegPassword(e.target.value)}
                                      placeholder="Mín. 6 caracteres"
                                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 pr-10 text-xs text-zinc-250"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowRegPassword(!showRegPassword)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#D4AF37] transition-colors"
                                    >
                                      {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Confirmar Senha</label>
                                  <div className="relative">
                                    <input 
                                      type={showRegConfirmPassword ? "text" : "password"} 
                                      required
                                      value={regConfirmPassword}
                                      onChange={e => setRegConfirmPassword(e.target.value)}
                                      placeholder="Confirme sua senha"
                                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 pr-10 text-xs text-zinc-250"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#D4AF37] transition-colors"
                                    >
                                      {showRegConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 pt-1 select-none">
                                <input 
                                  type="checkbox" 
                                  id="inline-terms"
                                  required
                                  checked={termsAccepted}
                                  onChange={e => setTermsAccepted(e.target.checked)}
                                  className="mt-0.5 h-3.5 w-3.5 accent-[#D4AF37]"
                                />
                                <label htmlFor="inline-terms" className="text-[9px] text-zinc-400 cursor-pointer font-medium">Li e concordo com os termos de uso e política de sigilo do Spa.</label>
                              </div>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={authLoading || !isRegisterValid}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900 border border-[#D4AF37]/35 py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {authLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" /> : 'Autenticar e Concluir'}
                          </button>
                        </form>
                      </div>
                    ) : isRoleLoading ? (
                      /* ROLE LOADING STATE */
                      <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-8 text-center flex flex-col justify-center items-center gap-3">
                        <Loader2 className="h-7 w-7 animate-spin text-[#D4AF37]" />
                        <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Avaliando Perfil...</span>
                      </div>
                    ) : userRole === 'admin' ? (
                      /* ADMIN WARNING BLOCK */
                      <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-5 space-y-4 text-center">
                        <div className="flex justify-center">
                          <div className="h-11 w-11 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg">
                            <AlertCircle className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">Conta Administrativa Detectada</span>
                          <p className="text-xs text-zinc-300 font-bold mt-1">Conectado como: {currentUser.email}</p>
                          <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed max-w-[240px] mx-auto font-medium">
                            Você está conectado com uma conta de Administrador. Agendamentos públicos devem ser feitos com uma conta de Cliente.
                          </p>
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              await signOut(auth);
                            } catch (err) {
                              console.error("Erro ao deslogar:", err);
                            }
                          }}
                          className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-900/40 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-amber-400 transition-all duration-300"
                        >
                          Alternar Conta / Sair
                        </button>
                      </div>
                    ) : (
                      /* USER LOGGED IN - CAN BOOK IMMEDIATELY */
                      <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-5 space-y-4 text-center">
                        <div className="flex justify-center">
                          <div className="h-11 w-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg">
                            <UserCheck className="h-5 w-5" />
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Sua Conta está Ativa</span>
                          <p className="text-xs text-zinc-300 font-bold mt-1">Olá, {currentUser.displayName || currentUser.email}</p>
                          <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] mx-auto font-medium">Você está logado e elegível para confirmar este agendamento.</p>
                        </div>

                        <button
                          onClick={() => setStep(5)}
                          className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-black shadow-lg shadow-[#D4AF37]/25 hover:from-[#CFB53B] hover:to-[#D4AF37] transition-all duration-300"
                        >
                          <span>Avançar para Pagamento</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* STEP 5: LUXURY CHECKOUT & PAYMENT */}
            {step === 5 && (
              <div className="space-y-6 animate-fade-in">
                {isPaymentSuccess ? (
                  /* SUCCESS RECEIPT VIEW */
                  <div className="text-center py-8 px-4 space-y-6 animate-fade-in flex flex-col items-center">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#CFB53B] flex items-center justify-center text-black shadow-lg shadow-[#D4AF37]/25 animate-bounce mb-2">
                      <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-2xl font-light font-serif-luxury tracking-wide text-white">
                        Sua Sessão Está <span className="text-[#D4AF37]">Confirmada!</span>
                      </h3>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                        Pagamento liquidado com sucesso via Stone Pagar.me. Seu refúgio de bem-estar está reservado e aguardando por você.
                      </p>
                    </div>

                    {/* Receipt Ticket mockup */}
                    {createdAppointment && (
                      <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-900 rounded-xl p-6 text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none" />
                        <div className="border-b border-zinc-950 pb-3 mb-4 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Recibo de Agendamento</span>
                          <span className="text-[9px] font-bold font-mono text-emerald-400 uppercase tracking-wider bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">
                            Pago • ID #{createdAppointment.id.slice(-6)}
                          </span>
                        </div>

                        <div className="space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[8px] text-zinc-500 uppercase tracking-widest block font-sans">Ritual Escolhido</span>
                              <strong className="text-zinc-200 mt-0.5 block">{createdAppointment.serviceName}</strong>
                            </div>
                            <div>
                              <span className="text-[8px] text-zinc-500 uppercase tracking-widest block font-sans">Profissional Responsável</span>
                              <strong className="text-zinc-200 mt-0.5 block">{createdAppointment.therapistName}</strong>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2.5 border-t border-zinc-900/50">
                            <div>
                              <span className="text-[8px] text-zinc-500 uppercase tracking-widest block font-sans">Data do Ritual</span>
                              <strong className="text-zinc-200 mt-0.5 block font-mono">
                                {createdAppointment.date.split('-').reverse().join('/')}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[8px] text-zinc-500 uppercase tracking-widest block font-sans">Horário da Sessão</span>
                              <strong className="text-zinc-200 mt-0.5 block font-mono">
                                {selectedTime} ({createdAppointment.totalDurationMinutes} min)
                              </strong>
                            </div>
                          </div>

                          {createdAppointment.additionalServices && createdAppointment.additionalServices.length > 0 && (
                            <div className="pt-2.5 border-t border-zinc-900/50">
                              <span className="text-[8px] text-zinc-500 uppercase tracking-widest block mb-1 font-sans">Rituais Adicionais</span>
                              <p className="text-zinc-400 leading-relaxed text-[11px] font-medium font-sans">
                                {createdAppointment.additionalServices.map(a => a.name).join(', ')}
                              </p>
                            </div>
                          )}

                          <div className="pt-3 border-t border-zinc-950 flex justify-between items-center">
                            <div>
                              <span className="text-[8px] text-[#D4AF37] uppercase tracking-widest block font-bold font-sans">Valor Total Liquidado</span>
                              <span className="text-white font-mono font-bold text-base">{formatBRL(createdAppointment.totalPrice)}</span>
                            </div>
                            <span className="text-[9px] text-zinc-500 font-mono">Stone Transaction App</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center pt-2">
                      <a 
                        href={createdAppointment ? getGoogleCalendarLink(createdAppointment) : '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 px-5 py-3 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:text-white transition-all duration-300 active:scale-[0.98] w-full sm:w-auto font-sans"
                      >
                        <CalendarCheck className="h-4.5 w-4.5 text-[#D4AF37]" />
                        <span>Adicionar ao Agenda</span>
                      </a>

                      <button
                        onClick={() => {
                          onSuccess();
                          onClose();
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] px-6 py-3 text-xs font-bold uppercase tracking-widest text-black shadow-lg shadow-[#D4AF37]/15 transition-all duration-300 active:scale-[0.98] w-full sm:w-auto font-sans"
                      >
                        <span>Concluir e Fechar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* PAYMENT SELECTION CHECKOUT PANEL */
                  <div className="space-y-6">
                    <div className="border-b border-zinc-900 pb-3">
                      <h3 className="text-lg font-light text-white font-serif-luxury tracking-wide">
                        Checkout de Luxo • <span className="text-[#D4AF37]">Stone Pagar.me</span>
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Selecione o método de pagamento preferencial e liquide com segurança máxima.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      
                      {/* Invoice/Receipt Summary Panel (Left Column) */}
                      <div className="md:col-span-5 bg-zinc-900/30 border border-zinc-900 rounded-xl p-5 space-y-4">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block border-b border-zinc-900 pb-2 font-sans">
                          Detalhes do Pagamento
                        </span>

                        <div className="space-y-3 text-xs font-sans">
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0">
                              <span className="text-zinc-400 font-semibold block truncate">{service.name}</span>
                              <span className="text-[10px] text-zinc-500 block mt-0.5">{service.durationMinutes} min de ritual base</span>
                            </div>
                            <span className="font-mono text-zinc-300 font-bold shrink-0">{formatBRL(service.price)}</span>
                          </div>

                          {activeUpsells.map(up => (
                            <div key={up.id} className="flex justify-between items-start gap-3 pt-2.5 border-t border-zinc-900/40">
                              <div className="min-w-0">
                                <span className="text-zinc-400 font-semibold block truncate">+ {up.name}</span>
                                <span className="text-[10px] text-zinc-500 block mt-0.5">+{up.durationMinutes} min adicionais</span>
                              </div>
                              <span className="font-mono text-zinc-300 font-bold shrink-0">{formatBRL(up.price)}</span>
                            </div>
                          ))}

                          <div className="space-y-1.5 pt-3.5 border-t border-zinc-900">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-500">Subtotal:</span>
                              <span className="font-mono text-zinc-400">{formatBRL(totalPriceCents)}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-500">Impostos / Taxas Stone:</span>
                              <span className="font-mono text-zinc-400">R$ 0,00 (Incluso)</span>
                            </div>
                            <div className="flex justify-between text-xs pt-2.5 border-t border-zinc-950">
                              <span className="text-white font-bold">Valor Total:</span>
                              <strong className="text-[#D4AF37] font-mono text-sm font-black">{formatBRL(totalPriceCents)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Security Assurance Badge */}
                        <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900/60 flex items-start gap-2.5">
                          <ShieldCheck className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider block font-sans">Conexão Criptografada SSL</span>
                            <p className="text-[9px] text-zinc-500 leading-relaxed font-medium font-sans">
                              Seus dados de pagamento e crédito estão protegidos sob conformidade de nível PCI-DSS pela Stone Pagar.me.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Payment Methods selector and inputs (Right Column) */}
                      <div className="md:col-span-7 space-y-4">
                        
                        {/* Selector Tabs */}
                        <div className="flex border border-zinc-900 rounded-lg p-1 bg-zinc-950">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('pix')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md flex items-center justify-center gap-2 transition-all ${
                              paymentMethod === 'pix'
                                ? 'bg-gradient-to-r from-[#D4AF37]/15 to-[#CFB53B]/5 border border-[#D4AF37]/20 text-[#D4AF37]'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            <Smartphone className="h-4 w-4" />
                            <span>Pix Instantâneo</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('card')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md flex items-center justify-center gap-2 transition-all ${
                              paymentMethod === 'card'
                                ? 'bg-gradient-to-r from-[#D4AF37]/15 to-[#CFB53B]/5 border border-[#D4AF37]/20 text-[#D4AF37]'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            <CreditCard className="h-4 w-4" />
                            <span>Cartão de Crédito</span>
                          </button>
                        </div>

                        {/* PIX PAY PANEL */}
                        {paymentMethod === 'pix' && (
                          <div className="border border-zinc-900 rounded-xl bg-zinc-950 p-5 space-y-5 animate-fadeIn">
                            <div className="flex flex-col items-center text-center space-y-3">
                              
                              {/* Pulsing QR Code Mockup */}
                              <div className="relative p-2 rounded-xl border border-[#D4AF37]/25 bg-zinc-900 shadow-md">
                                <div className="absolute inset-0 bg-[#D4AF37]/2 animate-pulse rounded-xl" />
                                <svg className="h-32 w-32 text-[#D4AF37] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h4v2h-4v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-4-4h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 2h2v2h-2v-2zm-6-6h2v2h-2v-2zm2 2h2v2h-2v-2zm-4 4h2v2h-2v-2zM15 15h2v2h-2v-2zm2-2h2v2h-2v-2zm0 4h2v2h-2v-2zm-4-4h2v2h-2v-2z" />
                                </svg>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-sans">Aguardando Pagamento Pix...</span>
                                <div className="flex items-center justify-center gap-1.5 font-mono text-xs text-[#D4AF37]">
                                  <Clock className="h-3.5 w-3.5 animate-pulse" />
                                  <span>Expira em {formatCountdown(pixCountdown)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Copia e Cola Field */}
                            <div className="space-y-1.5">
                              <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-sans">Código Copia e Cola</label>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  readOnly
                                  value="00020101021226870014br.gov.bcb.pix2565pix.pagarme.stone/spa-experience-payment-ritual-checkout-gold-premium-compliance-ssl"
                                  className="flex-1 bg-zinc-900 border border-zinc-850 rounded-lg p-2.5 text-[10px] text-zinc-400 font-mono focus:outline-none select-all truncate"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText("00020101021226870014br.gov.bcb.pix2565pix.pagarme.stone/spa-experience-payment-ritual-checkout-gold-premium-compliance-ssl");
                                    setPixCopied(true);
                                    setTimeout(() => setPixCopied(false), 2000);
                                  }}
                                  className={`px-3 rounded-lg border transition-all flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                                    pixCopied 
                                      ? 'bg-emerald-950 border-emerald-500 text-emerald-400' 
                                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
                                  }`}
                                >
                                  {pixCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                  <span>{pixCopied ? 'Copiado!' : 'Copiar'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Simulated Confirm via Webhook */}
                            <div className="pt-2 border-t border-zinc-900">
                              <button
                                type="button"
                                disabled={isProcessingPayment}
                                onClick={() => handleProcessCheckout()}
                                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-black shadow-lg shadow-[#D4AF37]/20 transition-all duration-300 disabled:opacity-50"
                              >
                                {isProcessingPayment ? (
                                  <>
                                    <Loader2 className="h-4.5 w-4.5 animate-spin text-black" />
                                    <span>Processando via Pagar.me...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-4.5 w-4.5 text-black" />
                                    <span>Simular Confirmação Pix (Stone SDK)</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* CREDIT CARD PAY PANEL */}
                        {paymentMethod === 'card' && (
                          <div className="border border-zinc-900 rounded-xl bg-zinc-950 p-5 space-y-5 animate-fadeIn">
                            
                            {/* CSS CREDIT CARD MOCKUP */}
                            <div className="relative w-full h-40 rounded-xl bg-gradient-to-tr from-zinc-950 via-[#1A1813] to-zinc-900 border border-[#D4AF37]/25 p-4 flex flex-col justify-between overflow-hidden shadow-gold-premium">
                              <div className="absolute top-0 right-0 h-40 w-44 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.06)_0%,transparent_60%)] pointer-events-none" />
                              
                              <div className="flex justify-between items-start">
                                {/* Card Chip Mockup */}
                                <div className="h-7 w-10 rounded bg-zinc-900 border border-zinc-800 relative flex items-center justify-center overflow-hidden">
                                  <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/20 to-transparent pointer-events-none" />
                                  <div className="w-px h-full bg-zinc-850 absolute left-1/3" />
                                  <div className="w-px h-full bg-zinc-850 absolute left-2/3" />
                                  <div className="h-px w-full bg-zinc-850 absolute top-1/2" />
                                </div>

                                {/* Dynamic Card Brand badge */}
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest border border-zinc-850 bg-zinc-950 px-2 py-0.5 rounded font-sans font-sans">
                                  {cardBrand === 'visa' ? 'Visa' :
                                   cardBrand === 'mastercard' ? 'Mastercard' :
                                   cardBrand === 'amex' ? 'Amex' :
                                   cardBrand === 'elo' ? 'Elo' : 'Cartão Stone'}
                                </span>
                              </div>

                              {/* Card Number display */}
                              <div className="font-mono text-zinc-100 text-base tracking-wider font-semibold">
                                {cardNumber || '•••• •••• •••• ••••'}
                              </div>

                              <div className="flex justify-between items-end">
                                <div className="min-w-0 pr-4">
                                  <span className="text-[6.5px] text-zinc-500 uppercase tracking-widest block font-sans">Titular do Cartão</span>
                                  <span className="text-[11px] font-bold text-zinc-200 truncate block uppercase max-w-[170px] font-sans">
                                    {cardName || 'NOME COMPLETO'}
                                  </span>
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className="text-[6.5px] text-zinc-500 uppercase tracking-widest block font-sans">Validade</span>
                                  <span className="text-[11px] font-bold text-zinc-200 font-mono block">
                                    {cardExpiry || 'MM/AA'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* CARD INPUTS FORM */}
                            <form onSubmit={handleProcessCheckout} className="space-y-3 font-sans">
                              <div>
                                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Número do Cartão de Crédito</label>
                                <input 
                                  type="text" 
                                  required
                                  value={cardNumber}
                                  onChange={e => handleCardNumberChange(e.target.value)}
                                  placeholder="0000 0000 0000 0000"
                                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-2.5 text-xs text-zinc-100 font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome Impresso no Cartão</label>
                                <input 
                                  type="text" 
                                  required
                                  value={cardName}
                                  onChange={e => setCardName(e.target.value)}
                                  placeholder="ex: MARIA S SILVA"
                                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-2.5 text-xs text-zinc-100 uppercase"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Validade (MM/AA)</label>
                                  <input 
                                    type="text" 
                                    required
                                    value={cardExpiry}
                                    onChange={e => handleExpiryChange(e.target.value)}
                                    placeholder="12/28"
                                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-2.5 text-xs text-zinc-100 font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Código CVV</label>
                                  <input 
                                    type="password" 
                                    required
                                    value={cardCvv}
                                    onChange={e => handleCvvChange(e.target.value)}
                                    placeholder="•••"
                                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-2.5 text-xs text-zinc-100 font-mono"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Parcelamento (Stone Split)</label>
                                <select 
                                  value={installments}
                                  onChange={e => setInstallments(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-2.5 text-xs text-zinc-100 font-bold"
                                >
                                  <option value="1">1x de {formatBRL(totalPriceCents)} sem juros</option>
                                  <option value="2">2x de {formatBRL(totalPriceCents / 2)} sem juros</option>
                                  <option value="3">3x de {formatBRL(totalPriceCents / 3)} sem juros</option>
                                </select>
                              </div>

                              <button
                                type="submit"
                                disabled={isProcessingPayment || !cardNumber || !cardName || !cardExpiry || !cardCvv}
                                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-black shadow-lg shadow-[#D4AF37]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                              >
                                {isProcessingPayment ? (
                                  <>
                                    <Loader2 className="h-4.5 w-4.5 animate-spin text-black" />
                                    <span>Processando Transação...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4.5 w-4.5 text-black stroke-[3]" />
                                    <span>Pagar {formatBRL(totalPriceCents)} via Stone</span>
                                  </>
                                )}
                              </button>
                            </form>
                          </div>
                        )}

                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* STEPPER NAV BUTTONS FOOTER */}
        {!isLoading && (
          <div className="bg-[#0b0b0b] border-t border-zinc-900 px-6 py-4 flex items-center justify-between">
            <button
              onClick={handlePrevStep}
              disabled={step === 1 || isSubmitting}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Voltar</span>
            </button>

            {step < 4 && (
              <button
                onClick={handleNextStep}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-[#D4AF37]/35 hover:bg-[#D4AF37]/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#D4AF37] transition-all duration-300"
              >
                <span>Avançar</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
