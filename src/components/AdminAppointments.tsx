import React, { useState, useEffect } from 'react';
import { getTherapistImageStyle } from '../utils/imageUtils';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  Sparkles, 
  X, 
  Loader2, 
  DollarSign, 
  FileText,
  Sliders,
  Lock,
  Brush,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  query, 
  where, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { listAllServices } from '../services/serviceAPI';
import { Service, Therapist, Appointment, AppointmentStatus, PaymentStatus, DaySchedule, BusinessOpeningHours } from '../types';
import { calculateSplit } from '../services/pagarme';

export const AdminAppointments: React.FC = () => {
  // Date State - Default to today (YYYY-MM-DD in local time)
  const getTodayLocalDate = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
    return localISOTime;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalDate());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[] | null>(null);
  
  // Custom states requested in PRD
  const [expandHours, setExpandHours] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false); // Exclusão confirmation
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [preselectedSlot, setPreselectedSlot] = useState<string>('09:00');
  const [preselectedTherapistId, setPreselectedTherapistId] = useState<string>('');

  // Form States - Create Appointment
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('09:00');

  // Client Details loaded on click
  const [selectedClientDetails, setSelectedClientDetails] = useState<{ name: string; email: string; cpf: string; phone: string } | null>(null);
  const [isClientDetailsLoading, setIsClientDetailsLoading] = useState(false);

  // Map of client/user IDs to their real registered names
  const [clientRealNames, setClientRealNames] = useState<Record<string, string>>({});

  // Form States - Edit Appointment Status & Payment
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [editAppointmentStatus, setEditAppointmentStatus] = useState<AppointmentStatus>('confirmed');
  const [editDiscountAmount, setEditDiscountAmount] = useState<string>('0');
  const [editNotes, setEditNotes] = useState<string>('');

  // Rescheduling States (Reactive & Secure)
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState('09:00');
  const [rescheduleTherapistId, setRescheduleTherapistId] = useState('');
  const [rescheduleDateAppointments, setRescheduleDateAppointments] = useState<Appointment[]>([]);
  const [isReschedLoading, setIsReschedLoading] = useState(false);

  // Get days of the currently selected week (Monday to Sunday)
  const getWeekDays = (referenceDateStr: string) => {
    const refDate = new Date(referenceDateStr + 'T12:00:00');
    const day = refDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + diffToMonday);
    
    const weekDaysList = [];
    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;
      
      weekDaysList.push({
        dateStr: dateString,
        dayLabel: dayLabels[d.getDay()],
        dayNum: dd,
        monthNum: mm,
        isToday: dateString === getTodayLocalDate(),
        isActive: dateString === referenceDateStr
      });
    }
    return weekDaysList;
  };

  // Initial Load: Services, Therapists, and Weekly Opening Hours
  useEffect(() => {
    const loadBasics = async () => {
      try {
        const fetchedServices = await listAllServices();
        setServices(fetchedServices);

        const therapistsRef = collection(db, 'therapists');
        const therapistSnap = await getDocs(therapistsRef);
        const fetchedTherapists: Therapist[] = [];
        therapistSnap.forEach(snap => {
          fetchedTherapists.push(snap.data() as Therapist);
        });
        setTherapists(fetchedTherapists);

        // Fetch Weekly Opening Hours config
        const configDocRef = doc(db, 'config', 'opening_hours');
        const configSnap = await getDoc(configDocRef);
        if (configSnap.exists()) {
          const data = configSnap.data() as BusinessOpeningHours;
          if (data.weeklySchedule && data.weeklySchedule.length === 7) {
            setWeeklySchedule(data.weeklySchedule);
          }
        }
      } catch (err: any) {
        console.error('Error loading config/catalog resources:', err);
      }
    };
    loadBasics();
  }, []);

  // Reactive Load: Fetch appointments matching the entire selected week for Operative Micro-Dashboard
  useEffect(() => {
    const fetchAppointmentsForWeek = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const weekDaysList = getWeekDays(selectedDate);
        if (weekDaysList.length === 0) return;
        const firstDate = weekDaysList[0].dateStr;
        const lastDate = weekDaysList[6].dateStr;

        const appointmentsRef = collection(db, 'appointments');
        const q = query(
          appointmentsRef, 
          where('date', '>=', firstDate),
          where('date', '<=', lastDate)
        );
        const querySnapshot = await getDocs(q);

        const fetchedAppointments: Appointment[] = [];
        querySnapshot.forEach((docSnap) => {
          fetchedAppointments.push(docSnap.data() as Appointment);
        });

        // Fetch all users to map userIds to real registered names dynamically
        try {
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          const namesMap: Record<string, string> = {};
          usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            if (userData && userData.name) {
              namesMap[userDoc.id] = userData.name;
            }
          });
          setClientRealNames(namesMap);
        } catch (usersErr) {
          console.error('Error loading users for real name resolution:', usersErr);
        }

        setAppointments(fetchedAppointments);
      } catch (err: any) {
        console.error('Error fetching appointments for week:', err);
        setError('Ocorreu um erro ao buscar os agendamentos no Firestore.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointmentsForWeek();
  }, [selectedDate]);

  // Reactive Load for Rescheduling Availability checks on the selected target rescheduleDate
  useEffect(() => {
    if (!isEditModalOpen || !rescheduleDate) {
      setRescheduleDateAppointments([]);
      return;
    }

    const fetchRescheduleDateAppointments = async () => {
      try {
        setIsReschedLoading(true);
        const appointmentsRef = collection(db, 'appointments');
        const q = query(appointmentsRef, where('date', '==', rescheduleDate));
        const querySnapshot = await getDocs(q);

        const fetched: Appointment[] = [];
        querySnapshot.forEach((docSnap) => {
          fetched.push(docSnap.data() as Appointment);
        });

        setRescheduleDateAppointments(fetched);
      } catch (err) {
        console.error('Error fetching reschedule date appointments:', err);
      } finally {
        setIsReschedLoading(false);
      }
    };

    fetchRescheduleDateAppointments();
  }, [rescheduleDate, isEditModalOpen]);

  // Date Navigation Actions
  const handlePreviousDay = () => {
    const currentDate = new Date(selectedDate + 'T12:00:00');
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const currentDate = new Date(selectedDate + 'T12:00:00');
    currentDate.setDate(currentDate.getDate() + 1);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  // Extract opening interval for currently selected day
  const getOpeningHoursForDay = () => {
    const defaultHours = { isOpen: true, start: '09:00', end: '19:00' };
    if (!weeklySchedule) return defaultHours;
    
    // Day index (0: Sunday, 1: Monday, ..., 6: Saturday)
    const dayIndex = new Date(selectedDate + 'T12:00:00').getDay();
    const dayConfig = weeklySchedule.find(d => d.dayOfWeek === dayIndex);
    
    if (!dayConfig) return defaultHours;
    
    const interval = dayConfig.intervals[0] || { start: '09:00', end: '19:00' };
    return {
      isOpen: dayConfig.isOpen,
      start: interval.start,
      end: interval.end
    };
  };

  // Helper to generate dynamic time slots every 30 mins
  const generateSlots = (startStr: string, endStr: string) => {
    const slots: string[] = [];
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    
    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    while (currentMinutes <= endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      slots.push(timeString);
      currentMinutes += 30; // 30-minute interval steps
    }
    return slots;
  };

  // Generate slots honoring standard opening hours or overrides
  const getDailySlots = () => {
    const { isOpen, start, end } = getOpeningHoursForDay();
    
    if (expandHours || !isOpen) {
      return generateSlots('08:00', '20:30');
    }
    
    return generateSlots(start, end);
  };

  // Open Creation Modal with pre-selected therapist and slot!
  const openCreationModal = (slot: string, therapistId?: string) => {
    setPreselectedSlot(slot);
    setSelectedTimeSlot(slot);
    setPreselectedTherapistId(therapistId || '');
    setSelectedTherapistId(therapistId || (therapists.length > 0 ? therapists[0].id : ''));
    
    if (services.length > 0) setSelectedServiceId(services[0].id);

    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setClientCpf('');
    setIsCreateModalOpen(true);
  };

  // Open Management/Edit Modal & initialize reschedule defaults
  const openEditModal = (appointment: Appointment) => {
    setActiveAppointment(appointment);
    setEditPaymentStatus(appointment.paymentStatus);
    setEditAppointmentStatus(appointment.status);
    setEditDiscountAmount('0');
    setEditNotes(appointment.cancellationReason || '');
    
    // Reschedule form resets
    setIsRescheduling(false);
    setRescheduleDate(appointment.date);
    
    let currentStartSlot = '09:00';
    if (appointment.startTime) {
      currentStartSlot = appointment.startTime.split('T')[1]?.substring(0, 5) || '09:00';
    }
    setRescheduleTimeSlot(currentStartSlot);
    setRescheduleTherapistId(appointment.therapistId);

    // Initialize display with denormalized values as direct fallback
    const fallbackDetails = {
      name: appointment.clientName,
      email: appointment.clientEmail,
      phone: appointment.clientPhone || '',
      cpf: appointment.clientCpf || ''
    };
    setSelectedClientDetails(fallbackDetails);

    setIsEditModalOpen(true);

    // If we have a genuine registered user ID, fetch latest credentials dynamically
    if (appointment.clientId && appointment.clientId !== 'admin-manual') {
      setIsClientDetailsLoading(true);
      
      const loadClientFreshData = async () => {
        try {
          const userSnap = await getDoc(doc(db, 'users', appointment.clientId));
          const privateSnap = await getDoc(doc(db, 'users', appointment.clientId, 'private', 'info'));
          
          let fetchedName = appointment.clientName;
          let fetchedEmail = appointment.clientEmail;
          let fetchedPhone = appointment.clientPhone || '';
          let fetchedCpf = appointment.clientCpf || '';

          if (userSnap.exists()) {
            const userData = userSnap.data();
            fetchedName = userData?.name || fetchedName;
            fetchedEmail = userData?.email || fetchedEmail;
          }

          if (privateSnap.exists()) {
            const privateData = privateSnap.data();
            fetchedPhone = privateData?.phone || fetchedPhone;
            const encryptedCpfBase64 = privateData?.encryptedCpf;
            if (encryptedCpfBase64) {
              try {
                const decoded = atob(encryptedCpfBase64);
                if (decoded.length === 11) {
                  fetchedCpf = `${decoded.slice(0, 3)}.${decoded.slice(3, 6)}.${decoded.slice(6, 9)}-${decoded.slice(9)}`;
                } else {
                  fetchedCpf = decoded;
                }
              } catch (decErr) {
                console.error('Error decoding CPF:', decErr);
                fetchedCpf = encryptedCpfBase64;
              }
            }
          }

          setSelectedClientDetails({
            name: fetchedName,
            email: fetchedEmail,
            phone: fetchedPhone,
            cpf: fetchedCpf
          });
        } catch (fetchErr) {
          console.error('Failed to load fresh client details:', fetchErr);
        } finally {
          setIsClientDetailsLoading(false);
        }
      };

      loadClientFreshData();
    } else {
      setIsClientDetailsLoading(false);
    }
  };

  // Create Manual Appointment Submission (storing raw ISO direct local string)
  const handleCreateAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const targetService = services.find(s => s.id === selectedServiceId);
      const targetTherapist = therapists.find(t => t.id === selectedTherapistId);

      if (!targetService || !targetTherapist) {
        throw new Error('Por favor, selecione um serviço e um massoterapeuta válidos.');
      }

      const appointmentsRef = collection(db, 'appointments');
      const newDocRef = doc(appointmentsRef);

      const [sh, sm] = selectedTimeSlot.split(':').map(Number);
      const startMinutesTotal = sh * 60 + sm;
      const endMinutesTotal = startMinutesTotal + targetService.durationMinutes;
      const endH = Math.floor(endMinutesTotal / 60);
      const endM = endMinutesTotal % 60;
      const endTimeSlot = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      const finalStartTimeStr = `${selectedDate}T${selectedTimeSlot}:00`;
      const finalEndTimeStr = `${selectedDate}T${endTimeSlot}:00`;

      const commPercentage = targetTherapist.commissionPercentage !== undefined ? targetTherapist.commissionPercentage : 30;
      const splitResults = calculateSplit(targetService.price, 'card', 1, commPercentage);

      const newAppointmentPayload: Appointment = {
        id: newDocRef.id,
        clientId: 'admin-manual',
        clientName: clientName,
        clientEmail: clientEmail || 'agendamento.manual@spa.com',
        clientPhone: clientPhone || '',
        clientCpf: clientCpf || '',
        therapistId: targetTherapist.id,
        therapistName: targetTherapist.name,
        serviceId: targetService.id,
        serviceName: targetService.name,
        serviceDuration: targetService.durationMinutes,
        preparationDuration: targetService.preparationMinutes || 20, 
        additionalServices: [],
        date: selectedDate,
        startTime: finalStartTimeStr, 
        endTime: finalEndTimeStr,     
        totalDurationMinutes: targetService.durationMinutes,
        basePrice: targetService.price,
        additionalPrice: 0,
        totalPrice: targetService.price,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        pagarmeFee: splitResults.pagarmeFee,
        netAmount: splitResults.netAmount,
        therapistCommissionPercentage: splitResults.therapistCommissionPercentage,
        therapistShare: splitResults.therapistShare,
        spaShare: splitResults.spaShare,
        paymentInstallments: 1,
        cancellationReason: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(newDocRef, newAppointmentPayload);

      setAppointments(prev => [...prev, newAppointmentPayload]);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error('Error creating manual appointment:', err);
      setError(err.message || 'Falha ao gravar o agendamento no Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit/Update Appointment Submission
  const handleEditAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppointment || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const docRef = doc(db, 'appointments', activeAppointment.id);
      
      const discountVal = Math.round(parseFloat(editDiscountAmount.replace(',', '.')) * 100) || 0;
      const finalTotalPrice = Math.max(0, activeAppointment.basePrice - discountVal);

      const matchingTherapist = therapists.find(t => t.id === activeAppointment.therapistId);
      const commPercentage = matchingTherapist && matchingTherapist.commissionPercentage !== undefined 
        ? matchingTherapist.commissionPercentage 
        : 30;
      
      const pMethod = activeAppointment.paymentGatewayDetails?.paymentMethod === 'pix' ? 'pix' : 'card';
      const pInstallments = activeAppointment.paymentInstallments || 1;
      const splitResults = calculateSplit(finalTotalPrice, pMethod, pInstallments, commPercentage);

      const updatePayload = {
        paymentStatus: editPaymentStatus,
        status: editAppointmentStatus,
        totalPrice: finalTotalPrice,
        pagarmeFee: splitResults.pagarmeFee,
        netAmount: splitResults.netAmount,
        therapistCommissionPercentage: splitResults.therapistCommissionPercentage,
        therapistShare: splitResults.therapistShare,
        spaShare: splitResults.spaShare,
        cancellationReason: editNotes,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(docRef, updatePayload);

      setAppointments(prev => 
        prev.map(app => 
          app.id === activeAppointment.id 
            ? { ...app, ...updatePayload } 
            : app
        )
      );

      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Error updating appointment:', err);
      setError('Erro ao salvar as modificações no Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // RESCHEDULE SERVICE HANDLER (Atualiza Firestore, data e horários e remaneja terapeuta se necessário)
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppointment || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const targetTherapist = therapists.find(t => t.id === rescheduleTherapistId);
      if (!targetTherapist) {
        throw new Error('Terapeuta não encontrado ou inativo.');
      }

      // Re-calculate start & end local ISO strings
      const [sh, sm] = rescheduleTimeSlot.split(':').map(Number);
      const startMinutesTotal = sh * 60 + sm;
      const endMinutesTotal = startMinutesTotal + activeAppointment.serviceDuration;
      const endH = Math.floor(endMinutesTotal / 60);
      const endM = endMinutesTotal % 60;
      const endTimeSlot = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      const finalStartTimeStr = `${rescheduleDate}T${rescheduleTimeSlot}:00`;
      const finalEndTimeStr = `${rescheduleDate}T${endTimeSlot}:00`;

      const docRef = doc(db, 'appointments', activeAppointment.id);
      
      const reschedulePayload = {
        date: rescheduleDate,
        startTime: finalStartTimeStr,
        endTime: finalEndTimeStr,
        therapistId: targetTherapist.id,
        therapistName: targetTherapist.name,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(docRef, reschedulePayload);

      // Refresh state: if rescheduleDate belongs to currently active week, update it, else filter it out from current view
      const weekDaysList = getWeekDays(selectedDate);
      const isInActiveWeek = weekDaysList.some(day => day.dateStr === rescheduleDate);

      setAppointments(prev => {
        if (isInActiveWeek) {
          return prev.map(app => 
            app.id === activeAppointment.id 
              ? { ...app, ...reschedulePayload } 
              : app
          );
        } else {
          return prev.filter(app => app.id !== activeAppointment.id);
        }
      });

      setIsRescheduling(false);
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Error rescheduling appointment:', err);
      setError(err.message || 'Erro ao reagendar no Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete/Cancel Appointment Action
  const handleConfirmDeleteAppointment = async () => {
    if (!activeAppointment || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await deleteDoc(doc(db, 'appointments', activeAppointment.id));
      setAppointments(prev => prev.filter(app => app.id !== activeAppointment.id));
      setIsDeleteConfirmOpen(false);
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Error deleting appointment:', err);
      alert('Falha ao excluir o agendamento no Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Match and analyze overlaps FOR A SPECIFIC THERAPIST on a specific slot (Safety margin included)
  const getTherapistSlotStatus = (therapistId: string, slotTimeStr: string) => {
    const [slotH, slotM] = slotTimeStr.split(':').map(Number);
    const slotMinutes = slotH * 60 + slotM;

    // Filter appointments for this specific therapist ON THE ACTIVE SELECTED DATE
    const therapistApps = appointments.filter(app => app.therapistId === therapistId && app.date === selectedDate);

    for (const app of therapistApps) {
      const appTime = app.startTime;
      if (!appTime) continue;

      let appStartStr = '';
      if (typeof appTime === 'string') {
        appStartStr = appTime.split('T')[1]?.substring(0, 5) || '';
      } else if (appTime.seconds) {
        appStartStr = new Date(appTime.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }

      if (!appStartStr) continue;
      const [appH, appM] = appStartStr.split(':').map(Number);
      const appStartMinutes = appH * 60 + appM;
      
      const appDuration = app.totalDurationMinutes;
      const appEndMinutes = appStartMinutes + appDuration;
      
      const prepDuration = app.preparationDuration || 20;
      const safetyEndMinutes = appEndMinutes + prepDuration;

      // Exact match for the booking's starting moment
      if (slotMinutes === appStartMinutes) {
        return { type: 'appointment', appointment: app };
      }

      // Inside active appointment duration interval (ongoing)
      if (slotMinutes > appStartMinutes && slotMinutes < appEndMinutes) {
        return { type: 'ongoing', appointment: app };
      }

      // Inside the mandatory safety margin cleanup period
      if (slotMinutes >= appEndMinutes && slotMinutes < safetyEndMinutes) {
        return { type: 'safety_margin', appointment: app };
      }
    }

    return { type: 'free' };
  };

  // Safe checks for the target Rescheduling slot, ignoring the active appointment itself
  const getRescheduleSlotStatus = (slotTimeStr: string) => {
    if (!activeAppointment) return { type: 'free', label: '' };

    const [slotH, slotM] = slotTimeStr.split(':').map(Number);
    const slotMinutes = slotH * 60 + slotM;

    // Check if this slot matches the current start time of the active appointment on the active date/therapist
    const currentStartStr = activeAppointment.startTime ? activeAppointment.startTime.split('T')[1]?.substring(0, 5) : '';
    const isCurrentDate = activeAppointment.date === rescheduleDate;
    const isCurrentTherapist = activeAppointment.therapistId === rescheduleTherapistId;
    const isCurrentSlot = isCurrentDate && isCurrentTherapist && slotTimeStr === currentStartStr;

    if (isCurrentSlot) {
      return { type: 'current', label: '(Atual)' };
    }

    // Filter appointments of the rescheduleDate for the chosen rescheduleTherapist, ignoring this active appointment
    const targetApps = rescheduleDateAppointments.filter(
      app => app.therapistId === rescheduleTherapistId && app.id !== activeAppointment.id
    );

    for (const app of targetApps) {
      const appStartStr = app.startTime ? app.startTime.split('T')[1]?.substring(0, 5) : '';
      if (!appStartStr) continue;

      const [appH, appM] = appStartStr.split(':').map(Number);
      const appStartMinutes = appH * 60 + appM;
      
      const appDuration = app.totalDurationMinutes;
      const appEndMinutes = appStartMinutes + appDuration;
      
      const prepDuration = app.preparationDuration || 20;
      const safetyEndMinutes = appEndMinutes + prepDuration;

      // Slot is during the session duration
      if (slotMinutes >= appStartMinutes && slotMinutes < appEndMinutes) {
        return { type: 'occupied', label: '(Ocupado)' };
      }

      // Slot is inside safety margin
      if (slotMinutes >= appEndMinutes && slotMinutes < safetyEndMinutes) {
        return { type: 'safety', label: '(Higienização)' };
      }
    }

    return { type: 'free', label: '' };
  };

  // Trava de Segurança: Checks if rescheduling starting at a specific slot would cause ANY duration or safety overlap
  const hasRescheduleConflict = (slotTimeStr: string) => {
    if (!activeAppointment) return false;

    const [sh, sm] = slotTimeStr.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = startMinutes + activeAppointment.serviceDuration;
    const prepDuration = activeAppointment.preparationDuration || 20;
    const totalEndMinutes = endMinutes + prepDuration;

    // Compare with all OTHER appointments for that therapist on that day
    const otherApps = rescheduleDateAppointments.filter(
      app => app.therapistId === rescheduleTherapistId && app.id !== activeAppointment.id
    );

    for (const app of otherApps) {
      const appStartStr = app.startTime ? app.startTime.split('T')[1]?.substring(0, 5) : '';
      if (!appStartStr) continue;

      const [appH, appM] = appStartStr.split(':').map(Number);
      const appStartMinutes = appH * 60 + appM;
      const appEndMinutes = appStartMinutes + app.totalDurationMinutes;
      const appPrepDuration = app.preparationDuration || 20;
      const appTotalEndMinutes = appEndMinutes + appPrepDuration;

      // Mathematical intersection: startMinutes < appTotalEndMinutes AND appStartMinutes < totalEndMinutes
      if (startMinutes < appTotalEndMinutes && appStartMinutes < totalEndMinutes) {
        return true; // Intersection found, safe-guard blocks!
      }
    }

    return false;
  };

  // Helper to determine dynamic box height class based on service duration minutes
  const getCardHeightClass = (duration: number) => {
    if (duration <= 30) return 'min-h-[90px] py-3.5';
    if (duration <= 60) return 'min-h-[150px] py-5';
    if (duration <= 90) return 'min-h-[210px] py-6.5';
    return 'min-h-[270px] py-8';
  };

  const formatBRL = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">Confirmado</span>;
      case 'cancelled':
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">Cancelado</span>;
      case 'completed':
        return <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">Concluído</span>;
      default:
        return <span className="bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">Pendente</span>;
    }
  };

  const getPaymentBadge = (payment: PaymentStatus) => {
    switch (payment) {
      case 'paid':
        return <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">Pago</span>;
      case 'refunded':
        return <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">Cortesia</span>;
      default:
        return <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">Aguardando</span>;
    }
  };

  const getWeekRangeLabel = (weekDaysList: any[]) => {
    if (weekDaysList.length === 0) return '';
    const first = weekDaysList[0];
    const last = weekDaysList[6];
    return `Semana de ${first.dayNum}/${first.monthNum} a ${last.dayNum}/${last.monthNum}`;
  };

  const handlePreviousWeek = () => {
    const currentDate = new Date(selectedDate + 'T12:00:00');
    currentDate.setDate(currentDate.getDate() - 7);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const currentDate = new Date(selectedDate + 'T12:00:00');
    currentDate.setDate(currentDate.getDate() + 7);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  // Format start - end times accurately
  const getFormattedInterval = (app: Appointment) => {
    const startStr = app.startTime ? app.startTime.split('T')[1]?.substring(0, 5) : '00:00';
    const endStr = app.endTime ? app.endTime.split('T')[1]?.substring(0, 5) : '00:00';
    return `${startStr} às ${endStr}`;
  };

  const { isOpen, start, end } = getOpeningHoursForDay();
  const activeSlots = getDailySlots();
  const weekDays = getWeekDays(selectedDate);

  // Validate chosen reschedule state
  const isRescheduleSelectionValid = rescheduleTimeSlot && (
    getRescheduleSlotStatus(rescheduleTimeSlot).type === 'current' || (
      getRescheduleSlotStatus(rescheduleTimeSlot).type === 'free' && !hasRescheduleConflict(rescheduleTimeSlot)
    )
  );

  // OPERATIONAL KPI CALCULATIONS
  const appointmentsToday = appointments.filter(app => app.date === selectedDate);
  const countToday = appointmentsToday.length;
  const completedToday = appointmentsToday.filter(app => app.status === 'completed').length;
  
  const countWeek = appointments.length;
  const completedWeek = appointments.filter(app => app.status === 'completed').length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-950/40 border border-red-900 rounded-lg p-4 text-xs font-sans text-red-200 animate-fade-in">
          {error}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-[#D4AF37] tracking-[0.2em] uppercase block mb-1">Painel Diário</span>
          <h2 className="text-2xl font-light text-white font-serif-luxury tracking-wide">Agenda de Atendimentos</h2>
        </div>
        <button
          onClick={() => openCreationModal('09:00')}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] hover:from-[#CFB53B] hover:to-[#D4AF37] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/15 transition-all duration-300 font-sans"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* OPERATIONAL MICRO-DASHBOARD (KPI BAR) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
        {/* Card 1: ATENDIMENTOS HOJE */}
        <div className="bg-[#111111] border border-zinc-900 rounded-xl p-4 flex flex-col justify-between hover:border-[#D4AF37]/30 transition-all duration-300 shadow-md">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Atendimentos Hoje</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-light text-[#D4AF37] font-sans tracking-tight">{countToday}</span>
            <span className="text-[10px] text-zinc-500">agendados</span>
          </div>
        </div>

        {/* Card 2: CONCLUÍDOS HOJE */}
        <div className="bg-[#111111] border border-zinc-900 rounded-xl p-4 flex flex-col justify-between hover:border-[#D4AF37]/30 transition-all duration-300 shadow-md">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Concluídos Hoje</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-light text-emerald-450 font-sans tracking-tight">{completedToday}</span>
            <span className="text-[10px] text-zinc-500">de {countToday} finalizados</span>
          </div>
        </div>

        {/* Card 3: TOTAL NA SEMANA */}
        <div className="bg-[#111111] border border-zinc-900 rounded-xl p-4 flex flex-col justify-between hover:border-[#D4AF37]/30 transition-all duration-300 shadow-md">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Total na Semana</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-light text-[#D4AF37] font-sans tracking-tight">{countWeek}</span>
            <span className="text-[10px] text-zinc-500">atendimentos</span>
          </div>
        </div>

        {/* Card 4: CONCLUÍDOS NA SEMANA */}
        <div className="bg-[#111111] border border-zinc-900 rounded-xl p-4 flex flex-col justify-between hover:border-[#D4AF37]/30 transition-all duration-300 shadow-md">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Concluídos na Semana</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-light text-emerald-450 font-sans tracking-tight">{completedWeek}</span>
            <span className="text-[10px] text-zinc-500">de {countWeek} finalizados</span>
          </div>
        </div>
      </div>

      {/* WEEKLY DATE NAVIGATION BAR & CONTROLS */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-5">
        {/* UPPER ROW: NAVIGATION ACTIONS */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-zinc-900/60 pb-4">
          <div className="flex flex-wrap items-center gap-3 font-sans">
            <button 
              onClick={handlePreviousWeek}
              className="p-2 text-zinc-400 hover:text-[#D4AF37] border border-zinc-900 rounded-lg hover:border-[#D4AF37]/30 transition-all duration-200 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
              title="Semana Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Semana Ant.</span>
            </button>
            
            <div className="relative flex items-center bg-zinc-900/60 rounded-lg px-4 py-2 border border-zinc-850">
              <CalendarDays className="h-4 w-4 text-[#D4AF37] mr-2" />
              <span className="text-xs text-zinc-300 font-semibold mr-2 hidden sm:inline">Ir para:</span>
              <input 
                type="date" 
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs text-zinc-100 font-bold focus:outline-none tracking-wide cursor-pointer"
              />
            </div>

            <button 
              onClick={handleNextWeek}
              className="p-2 text-zinc-400 hover:text-[#D4AF37] border border-zinc-900 rounded-lg hover:border-[#D4AF37]/30 transition-all duration-200 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
              title="Próxima Semana"
            >
              <span className="hidden sm:inline">Próx. Semana</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Range Label */}
            <span className="text-xs font-semibold text-zinc-400 border-l border-zinc-900 pl-3">
              {getWeekRangeLabel(weekDays)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-sans">
            {/* Opening Status Badge */}
            <div>
              {isOpen ? (
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] uppercase font-bold tracking-widest px-2.5 py-1.5 rounded-full">
                  Expediente: {start} às {end}
                </span>
              ) : (
                <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase font-bold tracking-widest px-2.5 py-1.5 rounded-full">
                  Spa Fechado (Recesso)
                </span>
              )}
            </div>

            {/* Admin Override Toggle */}
            <button
              onClick={() => setExpandHours(prev => !prev)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                expandHours 
                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]' 
                  : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Expandir Fora do Expediente</span>
            </button>
          </div>
        </div>

        {/* LOWER ROW: GOOGLE CALENDAR STYLE WEEK DAYS */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <button
              key={day.dateStr}
              onClick={() => setSelectedDate(day.dateStr)}
              className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all duration-300 font-sans relative ${
                day.isActive
                  ? 'bg-[#D4AF37] border-[#D4AF37] text-zinc-950 shadow-lg shadow-[#D4AF37]/20 font-bold scale-[1.02]'
                  : 'bg-zinc-900/20 border-zinc-900/60 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/40 hover:text-zinc-200'
              }`}
            >
              <span className={`text-[10px] uppercase font-semibold tracking-wider ${day.isActive ? 'text-zinc-950/80' : 'text-zinc-500'}`}>
                {day.dayLabel}
              </span>
              <span className="text-base sm:text-lg mt-1 font-light tracking-wide">
                {day.dayNum}
              </span>
              {day.isToday && (
                <span className={`absolute bottom-2 h-1.5 w-1.5 rounded-full ${day.isActive ? 'bg-zinc-950' : 'bg-[#D4AF37]'}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* DAILY SLOTS BENTO GRID - AUTONOMOUS COLUMNS BY THERAPIST */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-zinc-400 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-[#D4AF37]" />
          <span className="text-xs font-sans tracking-widest text-zinc-500 uppercase">Sincronizando Grades Individuais...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Day closed alert when expand is off */}
          {!isOpen && !expandHours && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 text-center max-w-lg mx-auto space-y-4">
              <Lock className="h-8 w-8 text-[#D4AF37] mx-auto opacity-80" />
              <p className="text-sm font-sans text-zinc-300">O Spa Experience encontra-se fechado neste dia.</p>
              <p className="text-xs font-sans text-zinc-500">Utilize a option <strong className="text-zinc-400">"Expandir Fora do Expediente"</strong> acima para visualizar ou forçar agendamentos excepcionais.</p>
            </div>
          )}

          {(isOpen || expandHours) && (
            /* Bento Grid style columns - autonomous layout with beautiful responsive columns on desktop */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {therapists.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-900 p-8 text-center rounded-xl col-span-full">
                  <p className="text-xs text-zinc-500 font-sans">Nenhuma profissional cadastrada no momento.</p>
                </div>
              ) : (
                therapists.map((therapist) => (
                  <div key={therapist.id} className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden shadow-2xl flex flex-col">
                    
                    {/* THERAPIST CARD HEADER */}
                    <div className="p-4 bg-zinc-900/30 border-b border-zinc-900 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0 shadow-inner">
                        <img 
                          src={therapist.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200'} 
                          alt={therapist.name} 
                          className="h-full w-full"
                          style={getTherapistImageStyle(therapist)}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-zinc-100 truncate">{therapist.name}</h4>
                        <span className="text-[10px] font-semibold text-[#D4AF37] tracking-wider uppercase block mt-0.5">Visão Autônoma</span>
                      </div>
                    </div>

                    {/* INDEPENDENT TIME SLOTS & BLOCKS FOR THIS THERAPIST */}
                    <div className="p-4 space-y-3 divide-y divide-zinc-900/40">
                      {activeSlots.map((slot) => {
                        const statusInfo = getTherapistSlotStatus(therapist.id, slot);

                        // If the slot is inside an ongoing session, skip rendering this row entirely
                        // This allows the starting main appointment card to span naturally without redundant space or empty gaps!
                        if (statusInfo.type === 'ongoing') {
                          return null;
                        }

                        return (
                          <div key={slot} className="flex gap-3 items-stretch pt-3 first:pt-0">
                            {/* Autonomous Hour Indicator on the left of each slot */}
                            <div className="w-12 shrink-0 flex items-center justify-center text-[11px] font-bold tracking-wider text-[#D4AF37]/90 font-sans">
                              {slot}
                            </div>

                            {/* Slot Content */}
                            <div className="flex-1">
                              {statusInfo.type === 'appointment' && statusInfo.appointment && (
                                /* 1. MAIN APPOINTMENT CARD (Ocupando visualmente altura correspondente) */
                                <div 
                                  onClick={() => openEditModal(statusInfo.appointment!)}
                                  className={`cursor-pointer bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-900 hover:border-[#D4AF37]/50 rounded-xl px-4 flex flex-col justify-between gap-3 transition-all duration-300 shadow-md shadow-black/40 text-left font-sans ${getCardHeightClass(statusInfo.appointment.totalDurationMinutes)}`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-2">
                                      <h5 className="text-xs font-bold text-zinc-100 truncate">
                                        {clientRealNames[statusInfo.appointment.clientId] || statusInfo.appointment.clientName}
                                      </h5>
                                      <span className="text-[9px] text-black font-bold bg-[#D4AF37] px-2 py-0.5 rounded shrink-0">
                                        {getFormattedInterval(statusInfo.appointment)}
                                      </span>
                                    </div>
                                    <p className="text-[11px] font-semibold text-[#D4AF37] mt-2 truncate">
                                      {statusInfo.appointment.serviceName}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 border-t border-zinc-900/60 pt-2.5 mt-1">
                                    <span className="text-[11px] font-bold text-zinc-200">
                                      {formatBRL(statusInfo.appointment.totalPrice)}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {getStatusBadge(statusInfo.appointment.status)}
                                      {getPaymentBadge(statusInfo.appointment.paymentStatus)}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {statusInfo.type === 'safety_margin' && statusInfo.appointment && (
                                /* 2. SAFETY MARGIN / CLEANUP BLOCK (Renderizado imediatamente após o término do bloco) */
                                <div className="bg-indigo-950/5 border border-dashed border-indigo-900/30 rounded-xl p-3 flex items-center justify-between text-[10px] text-indigo-400/80 animate-fade-in text-left font-sans">
                                  <div className="flex items-center gap-2 truncate">
                                    <Brush className="h-3.5 w-3.5 text-indigo-500/40" />
                                    <span>Bloqueio de Higienização (+{statusInfo.appointment.preparationDuration || 20}m)</span>
                                  </div>
                                  <span className="text-[8px] font-bold text-indigo-400/50 tracking-wider uppercase shrink-0">Prep</span>
                                </div>
                              )}

                              {statusInfo.type === 'free' && (
                                /* 3. FREE SLOTS READY FOR NEW RESERVATIONS */
                                <div 
                                  onClick={() => openCreationModal(slot, therapist.id)}
                                  className="cursor-pointer border border-dashed border-zinc-900/60 hover:border-[#D4AF37]/30 hover:bg-zinc-950/20 rounded-xl p-3 flex items-center justify-between transition-all duration-300 text-zinc-500 hover:text-[#D4AF37] font-sans text-xs"
                                >
                                  <span className="text-[10px] tracking-wider uppercase font-semibold text-zinc-600">Disponível</span>
                                  <button className="flex items-center gap-0.5 bg-zinc-950 hover:bg-[#D4AF37] hover:text-black border border-zinc-900 hover:border-[#D4AF37] text-zinc-400 rounded px-2 py-1 text-[9px] font-bold transition-all duration-200">
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Agendar</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE MANUAL BOOKING */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-xl bg-zinc-950 border border-[#D4AF37]/30 p-6 sm:p-8 shadow-gold-glow my-8">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white font-sans"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-light font-serif-luxury tracking-wide text-white mb-6">Agendar Nova Visita</h3>

            <form onSubmit={handleCreateAppointmentSubmit} className="space-y-4 font-sans text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Nome do Cliente</label>
                  <input 
                    type="text" 
                    required
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="ex: Carlos Alberto"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">WhatsApp / Celular</label>
                  <input 
                    type="tel" 
                    required
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    placeholder="ex: (11) 98765-4321"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">E-mail de Notificação (Opcional)</label>
                  <input 
                    type="email" 
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="ex: cliente@email.com"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">CPF do Cliente (Opcional)</label>
                  <input 
                    type="text" 
                    value={clientCpf}
                    onChange={e => setClientCpf(e.target.value)}
                    placeholder="ex: 123.456.789-00"
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  />
                </div>
              </div>

              {/* SERVICE SELECTION */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Serviço / Experiência</label>
                {services.length === 0 ? (
                  <p className="text-red-400 py-1">Nenhum serviço registrado para agendar.</p>
                ) : (
                  <select
                    value={selectedServiceId}
                    onChange={e => setSelectedServiceId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMinutes} min) - {formatBRL(s.price)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* THERAPIST SELECTION */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Profissional / Massoterapeuta</label>
                {therapists.length === 0 ? (
                  <p className="text-red-400 py-1">Nenhum terapeuta registrado para agendar.</p>
                ) : (
                  <select
                    value={selectedTherapistId}
                    onChange={e => setSelectedTherapistId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                  >
                    {therapists.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Data</label>
                  <input 
                    type="date" 
                    readOnly
                    value={selectedDate}
                    className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg p-3 text-sm text-zinc-400 focus:outline-none cursor-not-allowed font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Horário da Visita</label>
                  <select
                    value={selectedTimeSlot}
                    onChange={e => setSelectedTimeSlot(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100 font-bold"
                  >
                    {activeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || services.length === 0 || therapists.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-black shadow-lg shadow-[#D4AF37]/25 hover:from-[#CFB53B] hover:to-[#D4AF37] transition-all duration-300 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-black" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Agendar Atendimento</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT/MANAGE APPOINTMENT */}
      {isEditModalOpen && activeAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-xl bg-zinc-950 border border-[#D4AF37]/30 p-6 sm:p-8 shadow-gold-glow my-8">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white font-sans"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-light font-serif-luxury tracking-wide text-white mb-6">Gestão de Visita</h3>

            <div className="space-y-5 font-sans text-xs">
                          <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-2">
                <p className="text-xs text-zinc-300">
                  Cliente: <strong className="text-white font-bold">{clientRealNames[activeAppointment.clientId] || activeAppointment.clientName}</strong>
                </p>
                <p className="text-xs text-zinc-300">
                  Serviço: <strong className="text-white font-bold">{activeAppointment.serviceName}</strong>
                </p>
                <p className="text-xs text-zinc-300">
                  Horário: <strong className="text-[#D4AF37] font-bold">{getFormattedInterval(activeAppointment)}</strong>
                </p>
                <p className="text-xs text-zinc-300">
                  Terapeuta: <strong className="text-white font-bold">{activeAppointment.therapistName}</strong>
                </p>
                <p className="text-xs text-zinc-300">
                  Valor Base: <strong className="text-[#D4AF37]">{formatBRL(activeAppointment.basePrice)}</strong>
                </p>
              </div>

              {/* DADOS DE CADASTRO DO CLIENTE (NOME, E-MAIL, CPF e CELULAR) */}
              <div className="bg-zinc-900/60 border border-[#D4AF37]/20 p-4 rounded-xl space-y-3 relative overflow-hidden text-left">
                <div className="flex items-center justify-between border-b border-zinc-900/80 pb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[#D4AF37]" />
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Ficha Cadastral do Cliente</span>
                  </div>
                  {isClientDetailsLoading && (
                    <div className="flex items-center gap-1 text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Sincronizando...</span>
                    </div>
                  )}
                </div>

                {selectedClientDetails ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Nome Completo</span>
                      <span className="text-zinc-100 font-semibold break-words block mt-0.5">{selectedClientDetails.name || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">E-mail</span>
                      <span className="text-zinc-100 font-semibold break-all block mt-0.5">{selectedClientDetails.email || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">WhatsApp / Celular</span>
                      <span className="text-zinc-100 font-semibold block mt-0.5">{selectedClientDetails.phone || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">CPF</span>
                      <span className="text-zinc-100 font-mono font-semibold block mt-0.5">{selectedClientDetails.cpf || 'Não informado'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 italic">Carregando dados do cliente...</p>
                )}
              </div>

              {/* RE-SCHEDULE BUTTON OR FORM TRIGGER */}
              {!isRescheduling ? (
                <button
                  type="button"
                  onClick={() => setIsRescheduling(true)}
                  className="w-full py-3 px-4 rounded-xl border border-[#D4AF37]/30 hover:border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/5 text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  <span>Reagendar Atendimento</span>
                </button>
              ) : (
                /* RE-SCHEDULE DYNAMIC SUBFORM (SELETOR INTELIGENTE) */
                <form onSubmit={handleRescheduleSubmit} className="bg-zinc-900/50 border border-[#D4AF37]/20 p-5 rounded-xl space-y-4 animate-fade-in text-left">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#D4AF37]" />
                      <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">Seletor Inteligente de Horários</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRescheduling(false)}
                      className="text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-wide bg-zinc-900 hover:bg-zinc-850 px-2.5 py-1 rounded border border-zinc-800 transition-colors"
                    >
                      Voltar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Nova Data</label>
                      <input 
                        type="date"
                        required
                        value={rescheduleDate}
                        onChange={e => setRescheduleDate(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-xs text-zinc-100 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Remanejar Terapeuta</label>
                      <select
                        value={rescheduleTherapistId}
                        onChange={e => setRescheduleTherapistId(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-xs text-zinc-100 font-bold"
                      >
                        {therapists.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* CHIPS GRID SELECTOR (PÍLULAS DE DISPONIBILIDADE) */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                      Selecione o Horário Disponível (Duração: {activeAppointment.serviceDuration} min + {activeAppointment.preparationDuration || 20} min Higienização)
                    </label>
                    
                    {isReschedLoading ? (
                      <div className="flex items-center justify-center p-6 text-zinc-500 gap-2 border border-zinc-900 rounded-xl bg-zinc-950/20">
                        <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Analisando Disponibilidade da Terapeuta...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[160px] overflow-y-auto p-1.5 border border-zinc-900 rounded-xl bg-zinc-950/60 scrollbar-thin scrollbar-thumb-zinc-800 font-sans">
                        {activeSlots.map((slot) => {
                          const status = getRescheduleSlotStatus(slot);
                          const isSelected = rescheduleTimeSlot === slot;
                          const isCurrent = status.type === 'current';
                          const isFree = status.type === 'free';
                          const isOccupied = status.type === 'occupied';
                          const isSafety = status.type === 'safety';

                          // Trava de Segurança: check if selecting this free slot would overlap with subsequent services
                          const overflows = isFree && hasRescheduleConflict(slot);

                          let chipClass = '';
                          let label = slot;
                          let isDisabled = false;

                          if (isCurrent) {
                            chipClass = isSelected
                              ? 'bg-[#D4AF37] text-zinc-950 border-[#D4AF37] font-bold shadow-md shadow-[#D4AF37]/15 scale-[1.02]'
                              : 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/35 hover:bg-[#D4AF37]/25 font-bold';
                            label = `${slot} (Atual)`;
                          } else if (isOccupied) {
                            chipClass = 'bg-zinc-900/30 text-zinc-600 border-zinc-900/60 cursor-not-allowed opacity-35';
                            label = `${slot} (Ocupado)`;
                            isDisabled = true;
                          } else if (isSafety) {
                            chipClass = 'bg-zinc-900/30 text-zinc-600 border-zinc-900/60 cursor-not-allowed opacity-35';
                            label = `${slot} (Limpeza)`;
                            isDisabled = true;
                          } else if (overflows) {
                            chipClass = 'bg-red-950/10 text-red-500/40 border-red-950/20 cursor-not-allowed opacity-40';
                            label = `${slot} (Estouro)`;
                            isDisabled = true;
                          } else {
                            // Perfect Free Slot
                            chipClass = isSelected
                              ? 'bg-[#D4AF37] text-zinc-950 border-[#D4AF37] font-bold shadow-md shadow-[#D4AF37]/20 scale-[1.02]'
                              : 'bg-zinc-900/40 text-zinc-300 border-zinc-850 hover:border-[#D4AF37]/50 hover:text-[#D4AF37]';
                          }

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => setRescheduleTimeSlot(slot)}
                              className={`px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider rounded-lg border text-center transition-all duration-200 ${chipClass}`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Warning visual for potential overflows or selections */}
                  {rescheduleTimeSlot && hasRescheduleConflict(rescheduleTimeSlot) && getRescheduleSlotStatus(rescheduleTimeSlot).type !== 'current' && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-950/20 border border-red-900/40 rounded-lg p-2.5 text-[10px]">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span><strong>Alerta de Conflito:</strong> Este horário excede o limite livre e irá sobrepor outro atendimento desta profissional! Escolha outro horário livre.</span>
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRescheduling(false)}
                      className="flex-1 py-3 px-4 rounded-lg bg-zinc-900 border border-zinc-850 hover:border-zinc-750 text-zinc-300 text-[10px] font-bold uppercase tracking-wider transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !isRescheduleSelectionValid}
                      className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] text-black text-[10px] font-bold uppercase tracking-wider hover:from-[#CFB53B] hover:to-[#D4AF37] transition-all duration-300 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                      ) : (
                        <span>Salvar Reagendamento</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STANDARD EDIT FORM */}
              {!isRescheduling && (
                <form onSubmit={handleEditAppointmentSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* PAYMENT STATUS */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Status de Pagamento</label>
                      <select
                        value={editPaymentStatus}
                        onChange={e => setEditPaymentStatus(e.target.value as PaymentStatus)}
                        className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                      >
                        <option value="unpaid">Aguardando Pagamento</option>
                        <option value="paid">Pago</option>
                        <option value="refunded">Cortesia</option>
                      </select>
                    </div>

                    {/* APPOINTMENT STATUS */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Status do Agendamento</label>
                      <select
                        value={editAppointmentStatus}
                        onChange={e => setEditAppointmentStatus(e.target.value as AppointmentStatus)}
                        className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                      >
                        <option value="confirmed">Confirmado / Ativo</option>
                        <option value="pending">Aguardando Confirmação</option>
                        <option value="completed">Concluído</option>
                        <option value="cancelled">Cancelado pelo Spa</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {/* DISCOUNT */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-[#D4AF37]" />
                        <span>Conceder Desconto (R$)</span>
                      </label>
                      <input 
                        type="text" 
                        value={editDiscountAmount}
                        onChange={e => setEditDiscountAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-[#D4AF37]" />
                      <span>Notas Administrativas</span>
                    </label>
                    <textarea 
                      rows={2}
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder="Observações de atendimento..."
                      className="w-full bg-zinc-900 border border-zinc-850 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg p-3 text-sm text-zinc-100"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 border-t border-zinc-900 pt-5">
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirmOpen(true)} 
                      className="px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 border border-red-950 hover:bg-red-950/20 rounded-lg transition-all"
                    >
                      Excluir Visita
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-black shadow-lg shadow-[#D4AF37]/25 hover:from-[#CFB53B] hover:to-[#D4AF37] transition-all duration-300 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-black" />
                          <span>Gravando...</span>
                        </>
                      ) : (
                        <span>Atualizar Agendamento</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {isDeleteConfirmOpen && activeAppointment && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-xl bg-zinc-950 border border-red-900/50 p-6 sm:p-8 shadow-2xl shadow-red-950/20 text-center font-sans">
            <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            
            <h4 className="text-lg font-bold text-zinc-100 mb-2">Confirmar Exclusão</h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Tem certeza que deseja cancelar e excluir permanentemente este agendamento do cliente <strong className="text-white">{clientRealNames[activeAppointment.clientId] || activeAppointment.clientName}</strong>? Esta ação é irreversível no Firestore.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-5 py-3 rounded-lg border border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all bg-transparent"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAppointment}
                disabled={isSubmitting}
                className="px-5 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold uppercase tracking-wider text-white transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Sim, Confirmar Exclusão</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
