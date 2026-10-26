import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Service, Therapist, AdditionalService } from '../types';

export const DEFAULT_SERVICES: Service[] = [
  {
    id: 'massage-relaxante',
    name: 'Experiência Sensorial Relaxante',
    description: 'Uma massagem profunda que utiliza óleos essenciais aquecidos e manobras fluidas e contínuas para aliviar o estresse, reduzir a ansiedade e harmonizar corpo e mente. Ideal para restaurar o equilíbrio energético e revigorar os sentidos em uma atmosfera luxuosa.',
    price: 18000, // R$ 180,00
    durationMinutes: 60,
    preparationMinutes: 15,
    isActive: true,
    imageUrl: '/assets/images/massage_relaxante_1788944933320.jpg',
    createdAt: null,
    updatedAt: null,
  },
  {
    id: 'massage-pedras-quentes',
    name: 'Terapia de Pedras Vulcânicas',
    description: 'Massagem termoterápica onde pedras vulcânicas aquecidas são posicionadas em pontos de energia (chakras) combinadas com deslizamento profundo. O calor penetra nos tecidos musculares promovendo relaxamento extremo, alívio de dores crônicas e circulação ideal.',
    price: 24000, // R$ 240,00
    durationMinutes: 80,
    preparationMinutes: 20,
    isActive: true,
    imageUrl: '/assets/images/massage_stones_1788944950387.jpg',
    createdAt: null,
    updatedAt: null,
  },
  {
    id: 'massage-deep-tissue',
    name: 'Deep Tissue - Alívio de Tensões',
    description: 'Focada nas camadas mais profundas das fibras musculares. Utiliza pressão firme e movimentos lentos para desfazer nós de tensão, aliviar rigidez crônica, reabilitar fadiga muscular pós-treino e melhorar a amplitude de movimentos de forma terapêutica.',
    price: 21000, // R$ 210,00
    durationMinutes: 70,
    preparationMinutes: 15,
    isActive: true,
    imageUrl: '/assets/images/massage_deep_tissue_1788944966501.jpg',
    createdAt: null,
    updatedAt: null,
  },
  {
    id: 'massage-shiatsu',
    name: 'Equilíbrio Oriental Shiatsu',
    description: 'Prática tradicional baseada na acupressão japonesa. Utiliza a pressão dos dedos ao longo dos meridianos de energia do corpo para desobstruir fluxos energéticos, aliviar enxaquecas, tensões lombares e revigorar a vitalidade geral sem o uso de óleos.',
    price: 19500, // R$ 195,00
    durationMinutes: 60,
    preparationMinutes: 15,
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=1000',
    createdAt: null,
    updatedAt: null,
  }
];

export const DEFAULT_THERAPISTS: Therapist[] = [
  {
    id: 'therapist-leda',
    name: 'Leda Souza',
    email: 'leda.souza@spaexperience.com',
    phone: '(11) 97777-1010',
    bio: 'Massoterapeuta master com sólida experiência em massagem relaxante, pedras vulcânicas e terapias corporais exclusivas.',
    specialties: ['massage-relaxante', 'massage-pedras-quentes', 'massage-deep-tissue'],
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300',
    commissionPercentage: 30,
    pagarmeRecipientId: 're_ck_leda_souza',
    createdAt: null,
    updatedAt: null,
  },
  {
    id: 'therapist-kelsen',
    name: 'Kelsen Pantoja',
    email: 'kelsen.pantoja.prof@gmail.com',
    phone: '(11) 97777-2020',
    bio: 'Especialista em terapias manuais avançadas, Deep Tissue e Shiatsu tradicional oriental com vasta vivência clínica.',
    specialties: ['massage-deep-tissue', 'massage-shiatsu', 'massage-relaxante'],
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300',
    commissionPercentage: 30,
    pagarmeRecipientId: 're_ck_kelsen_pantoja',
    createdAt: null,
    updatedAt: null,
  },
  {
    id: 'therapist-helena',
    name: 'Helena Castro',
    email: 'helena.castro@spaexperience.com',
    phone: '(11) 98888-1111',
    bio: 'Especialista em terapias integrativas com mais de 8 anos de experiência em spas de luxo internacionais.',
    specialties: ['massage-relaxante', 'massage-pedras-quentes'],
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300',
    commissionPercentage: 30,
    pagarmeRecipientId: 're_ck_helena_castro',
    createdAt: null,
    updatedAt: null,
  },
  {
    id: 'therapist-mariana',
    name: 'Mariana Costa',
    email: 'mariana.costa@spaexperience.com',
    phone: '(11) 98888-2222',
    bio: 'Fisioterapeuta especializada em reabilitação muscular, Shiatsu tradicional e massagem Deep Tissue.',
    specialties: ['massage-deep-tissue', 'massage-shiatsu'],
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=300',
    commissionPercentage: 30,
    pagarmeRecipientId: 're_ck_mariana_costa',
    createdAt: null,
    updatedAt: null,
  },
  {
    id: 'therapist-camila',
    name: 'Camila Ramos',
    email: 'camila.ramos@spaexperience.com',
    phone: '(11) 98888-3333',
    bio: 'Especialista em termoterapia e pedras quentes vulcânicas com formação holística internacional.',
    specialties: ['massage-pedras-quentes', 'massage-relaxante', 'massage-deep-tissue'],
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300',
    commissionPercentage: 30,
    pagarmeRecipientId: 're_ck_camila_ramos',
    createdAt: null,
    updatedAt: null,
  }
];

export const DEFAULT_ADDITIONAL_SERVICES: AdditionalService[] = [
  {
    id: 'upsell-aromaterapia',
    name: 'Aromaterapia com Óleos Essenciais Raros',
    description: 'Infusão de óleos aromáticos puríssimos para potencializar o relaxamento e clareza mental.',
    price: 6000, // R$ 60,00
    durationMinutes: 15,
    isActive: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: 'upsell-esfoliacao',
    name: 'Esfoliação Corporal com Cristais Marinhos',
    description: 'Renovação celular profunda seguida de hidratação intensa para uma pele aveludada.',
    price: 9000, // R$ 90,00
    durationMinutes: 20,
    isActive: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: 'upsell-mascara-facial',
    name: 'Máscara Facial Hialurônica Iluminadora',
    description: 'Tratamento facial express hidratante com efeito iluminação imediata.',
    price: 8500, // R$ 85,00
    durationMinutes: 15,
    isActive: true,
    createdAt: null,
    updatedAt: null,
  }
];

/**
 * Ensures initial catalog services, therapists, and upsells are seeded in Firestore if empty or missing.
 */
export async function ensureDatabaseSeeded(): Promise<{
  services: Service[];
  therapists: Therapist[];
  additionalServices: AdditionalService[];
}> {
  try {
    // 1. Check Services
    const servicesRef = collection(db, 'services');
    const servicesSnap = await getDocs(servicesRef);
    let seededServices: Service[] = [];

    if (servicesSnap.empty) {
      console.log('Verificando inicialização do catálogo no Firestore...');
      try {
        for (const srv of DEFAULT_SERVICES) {
          const payload = { ...srv, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
          await setDoc(doc(db, 'services', srv.id), payload);
          seededServices.push(srv);
        }
      } catch (writeErr: any) {
        console.info('Catálogo mantido em cache local. O semeamento inicial no Firestore requer acesso administrativo:', writeErr?.message || writeErr);
        seededServices = DEFAULT_SERVICES;
      }
    } else {
      servicesSnap.forEach((docSnap) => {
        const data = docSnap.data() as Service;
        if (data.imageUrl && data.imageUrl.startsWith('/src/assets/')) {
          data.imageUrl = data.imageUrl.replace('/src/assets/', '/assets/');
        }
        seededServices.push(data);
      });
    }

    // 2. Check Therapists
    const therapistsRef = collection(db, 'therapists');
    const therapistsSnap = await getDocs(therapistsRef);
    let seededTherapists: Therapist[] = [];

    if (therapistsSnap.empty) {
      console.log('Verificando inicialização de terapeutas no Firestore...');
      try {
        for (const th of DEFAULT_THERAPISTS) {
          const payload = { ...th, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
          await setDoc(doc(db, 'therapists', th.id), payload);
          seededTherapists.push(th);
        }
      } catch (writeErr: any) {
        console.info('Terapeutas mantidas em cache local:', writeErr?.message || writeErr);
        seededTherapists = DEFAULT_THERAPISTS;
      }
    } else {
      therapistsSnap.forEach((docSnap) => {
        seededTherapists.push(docSnap.data() as Therapist);
      });
    }

    // 3. Check Additional Services
    const additionalsRef = collection(db, 'additional_services');
    const additionalsSnap = await getDocs(additionalsRef);
    let seededAdditionals: AdditionalService[] = [];

    if (additionalsSnap.empty) {
      console.log('Verificando serviços adicionais no Firestore...');
      try {
        for (const add of DEFAULT_ADDITIONAL_SERVICES) {
          const payload = { ...add, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
          await setDoc(doc(db, 'additional_services', add.id), payload);
          seededAdditionals.push(add);
        }
      } catch (writeErr: any) {
        console.info('Serviços adicionais mantidos em cache local:', writeErr?.message || writeErr);
        seededAdditionals = DEFAULT_ADDITIONAL_SERVICES;
      }
    } else {
      additionalsSnap.forEach((docSnap) => {
        seededAdditionals.push(docSnap.data() as AdditionalService);
      });
    }

    return {
      services: seededServices.length > 0 ? seededServices : DEFAULT_SERVICES,
      therapists: seededTherapists.length > 0 ? seededTherapists : DEFAULT_THERAPISTS,
      additionalServices: seededAdditionals.length > 0 ? seededAdditionals : DEFAULT_ADDITIONAL_SERVICES
    };
  } catch (error: any) {
    console.info('Sincronizando com o catálogo padrão Spa Experience:', error?.message || error);
    return {
      services: DEFAULT_SERVICES,
      therapists: DEFAULT_THERAPISTS,
      additionalServices: DEFAULT_ADDITIONAL_SERVICES
    };
  }
}
