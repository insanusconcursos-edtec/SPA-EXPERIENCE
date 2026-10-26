/**
 * Interface representing a Massage Service in the SPA EXPERIENCE system.
 */
export interface Service {
  /**
   * Unique identifier of the service
   */
  id: string;

  /**
   * Name of the massage service (e.g., "Massagem Relaxante", "Deep Tissue")
   */
  name: string;

  /**
   * Explanatory text about the benefits and methods of the massage
   */
  description: string;

  /**
   * Base price of the service stored in Cents (e.g., 18000 representing R$ 180,00)
   * Storing as integers avoids floating-point precision issues in financial calculations.
   */
  price: number;

  /**
   * Active duration of the therapy session in minutes (e.g., 50, 60, 90)
   */
  durationMinutes: number;

  /**
   * Preparation interval in minutes needed for room cleaning/turnover
   * before the next appointment starts (e.g., 15, 20)
   */
  preparationMinutes: number;

  /**
   * Flag indicating if the service is available for booking
   */
  isActive: boolean;

  /**
   * URL to the service cover image
   */
  imageUrl?: string;

  /**
   * URL to the demonstration video (Optional)
   */
  videoUrl?: string;

  /**
   * Creation timestamp (Firestore Timestamp)
   */
  createdAt: any;

  /**
   * Last update timestamp (Firestore Timestamp)
   */
  updatedAt: any;
}
