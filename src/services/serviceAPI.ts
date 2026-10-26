import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp, 
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Service, AdditionalService } from '../types';

/** ==========================================
 *   SERVICES (Massages) DATA ACCESS LAYER
 *  ========================================== */

/**
 * Creates a new Massage Service in the `/services` collection.
 * 
 * @param serviceData Omit ID, createdAt, and updatedAt as they are generated server-side.
 * @returns The generated unique service ID.
 */
export async function createService(
  serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const servicesRef = collection(db, 'services');
    
    // Create doc ref with auto-generated ID first so we can inject it as `id` field inside the document
    const docRef = doc(servicesRef);
    
    const newService: Service = {
      ...serviceData,
      id: docRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, newService);
    return docRef.id;
  } catch (error: any) {
    console.error('Error in createService:', error);
    throw new Error(`Failed to create massage service: ${error.message}`);
  }
}

/**
 * Lists all active Massage Services from the `/services` collection.
 * Efficient query filtered by `isActive == true`.
 * 
 * @returns An array of active Massage Services.
 */
export async function listActiveServices(): Promise<Service[]> {
  try {
    const servicesRef = collection(db, 'services');
    const activeQuery = query(servicesRef, where('isActive', '==', true));
    const querySnapshot = await getDocs(activeQuery);
    
    const services: Service[] = [];
    querySnapshot.forEach((docSnap) => {
      services.push(docSnap.data() as Service);
    });
    
    return services;
  } catch (error: any) {
    console.error('Error in listActiveServices:', error);
    throw new Error(`Failed to list active services: ${error.message}`);
  }
}

/**
 * Lists all Massage Services (both active and inactive) for admin dashboards.
 * 
 * @returns An array of all Massage Services.
 */
export async function listAllServices(): Promise<Service[]> {
  try {
    const servicesRef = collection(db, 'services');
    const querySnapshot = await getDocs(servicesRef);
    
    const services: Service[] = [];
    querySnapshot.forEach((docSnap) => {
      services.push(docSnap.data() as Service);
    });
    
    return services;
  } catch (error: any) {
    console.error('Error in listAllServices:', error);
    throw new Error(`Failed to list all services: ${error.message}`);
  }
}

/**
 * Updates an existing Massage Service.
 * 
 * @param serviceId The ID of the document to update.
 * @param updateData Partial fields to update.
 */
export async function updateService(
  serviceId: string,
  updateData: Partial<Omit<Service, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const serviceDocRef = doc(db, 'services', serviceId);
    
    // Prepare update payload with updated timestamp
    const payload = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(serviceDocRef, payload);
  } catch (error: any) {
    console.error(`Error in updateService for ID ${serviceId}:`, error);
    throw new Error(`Failed to update service: ${error.message}`);
  }
}


/** ==========================================
 *   ADDITIONAL SERVICES (Upsells) DATA ACCESS
 *  ========================================== */

/**
 * Creates a new Additional Service (Upsell) in the `/additional_services` collection.
 * 
 * @param additionalData Omit ID, createdAt, and updatedAt as they are generated server-side.
 * @returns The generated unique additional service ID.
 */
export async function createAdditionalService(
  additionalData: Omit<AdditionalService, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const additionalsRef = collection(db, 'additional_services');
    const docRef = doc(additionalsRef);
    
    const newAdditional: AdditionalService = {
      ...additionalData,
      id: docRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, newAdditional);
    return docRef.id;
  } catch (error: any) {
    console.error('Error in createAdditionalService:', error);
    throw new Error(`Failed to create additional service: ${error.message}`);
  }
}

/**
 * Lists all active Additional Services (Upsells) from the `/additional_services` collection.
 * Efficient query filtered by `isActive == true`.
 * 
 * @returns An array of active upsell services.
 */
export async function listActiveAdditionalServices(): Promise<AdditionalService[]> {
  try {
    const additionalsRef = collection(db, 'additional_services');
    const activeQuery = query(additionalsRef, where('isActive', '==', true));
    const querySnapshot = await getDocs(activeQuery);
    
    const additionals: AdditionalService[] = [];
    querySnapshot.forEach((docSnap) => {
      additionals.push(docSnap.data() as AdditionalService);
    });
    
    return additionals;
  } catch (error: any) {
    console.error('Error in listActiveAdditionalServices:', error);
    throw new Error(`Failed to list active additional services: ${error.message}`);
  }
}

/**
 * Updates an existing Additional Service (Upsell).
 * 
 * @param additionalId The ID of the document to update.
 * @param updateData Partial fields to update.
 */
export async function updateAdditionalService(
  additionalId: string,
  updateData: Partial<Omit<AdditionalService, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const additionalDocRef = doc(db, 'additional_services', additionalId);
    
    const payload = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(additionalDocRef, payload);
  } catch (error: any) {
    console.error(`Error in updateAdditionalService for ID ${additionalId}:`, error);
    throw new Error(`Failed to update additional service: ${error.message}`);
  }
}
