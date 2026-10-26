/**
 * Interface representing an Additional Service (Upsell) in the SPA EXPERIENCE system.
 */
export interface AdditionalService {
  /**
   * Unique identifier of the additional service
   */
  id: string;

  /**
   * Name of the upsell item (e.g., "Pedras Quentes", "Óleos Essenciais Orgânicos")
   */
  name: string;

  /**
   * Short description of the additional service benefits
   */
  description: string;

  /**
   * Additional cost stored in Cents (e.g., 4500 representing R$ 45,00)
   */
  price: number;

  /**
   * Additional duration in minutes this option adds to the appointment
   * (e.g., 15 minutes, or 0 if it fits within the main service's duration)
   */
  durationMinutes: number;

  /**
   * Flag indicating if this additional service is active for upsells
   */
  isActive: boolean;

  /**
   * Creation timestamp (Firestore Timestamp)
   */
  createdAt: any;

  /**
   * Last update timestamp (Firestore Timestamp)
   */
  updatedAt: any;
}
