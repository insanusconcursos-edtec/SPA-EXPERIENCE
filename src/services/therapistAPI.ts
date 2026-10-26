import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp, 
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Therapist } from '../types';

/** ==========================================
 *   THERAPISTS (Massoterapeutas) DATA ACCESS
 *  ========================================== */

/**
 * Registers a new Therapist in the `/therapists` collection.
 * 
 * @param therapistData Omit ID, createdAt, and updatedAt as they are generated server-side.
 * @returns The generated unique therapist ID.
 */
export async function createTherapist(
  therapistData: Omit<Therapist, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const therapistsRef = collection(db, 'therapists');
    const docRef = doc(therapistsRef);
    
    const newTherapist: Therapist = {
      ...therapistData,
      id: docRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, newTherapist);
    return docRef.id;
  } catch (error: any) {
    console.error('Error in createTherapist:', error);
    throw new Error(`Failed to register therapist: ${error.message}`);
  }
}

/**
 * Lists all active Therapists from the `/therapists` collection.
 * Filtered by `isActive == true` for real-time booking purposes.
 * 
 * @returns An array of active therapists.
 */
export async function listActiveTherapists(): Promise<Therapist[]> {
  try {
    const therapistsRef = collection(db, 'therapists');
    const activeQuery = query(therapistsRef, where('isActive', '==', true));
    const querySnapshot = await getDocs(activeQuery);
    
    const therapists: Therapist[] = [];
    querySnapshot.forEach((docSnap) => {
      therapists.push(docSnap.data() as Therapist);
    });
    
    return therapists;
  } catch (error: any) {
    console.error('Error in listActiveTherapists:', error);
    throw new Error(`Failed to list active therapists: ${error.message}`);
  }
}

/**
 * Finds all active Therapists qualified to perform a specific massage service.
 * Leverages the optimized `array-contains` index operator on the specialties list.
 * 
 * @param serviceId The ID of the primary massage service.
 * @returns An array of eligible, active therapists.
 */
export async function findTherapistsBySpecialty(serviceId: string): Promise<Therapist[]> {
  try {
    const therapistsRef = collection(db, 'therapists');
    
    // Complex compound query: must be active AND have the target serviceId in their specialties list.
    const specialtyQuery = query(
      therapistsRef, 
      where('isActive', '==', true),
      where('specialties', 'array-contains', serviceId)
    );
    
    const querySnapshot = await getDocs(specialtyQuery);
    
    const therapists: Therapist[] = [];
    querySnapshot.forEach((docSnap) => {
      therapists.push(docSnap.data() as Therapist);
    });
    
    return therapists;
  } catch (error: any) {
    console.error(`Error in findTherapistsBySpecialty for service ${serviceId}:`, error);
    throw new Error(`Failed to query therapists by specialty: ${error.message}`);
  }
}

/**
 * Updates an existing Therapist's details.
 * 
 * @param therapistId The ID of the document to update.
 * @param updateData Partial fields to update.
 */
export async function updateTherapist(
  therapistId: string,
  updateData: Partial<Omit<Therapist, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const therapistDocRef = doc(db, 'therapists', therapistId);
    
    const payload = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(therapistDocRef, payload);
  } catch (error: any) {
    console.error(`Error in updateTherapist for ID ${therapistId}:`, error);
    throw new Error(`Failed to update therapist: ${error.message}`);
  }
}
