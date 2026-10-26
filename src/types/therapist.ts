/**
 * Interface representing a Therapist (Massoterapeuta) in the SPA EXPERIENCE system.
 */
export interface Therapist {
  /**
   * Unique identifier of the therapist
   */
  id: string;

  /**
   * Full name of the therapist
   */
  name: string;

  /**
   * Professional email address
   */
  email: string;

  /**
   * Contact phone number (PII, protected under access rules)
   */
  phone: string;

  /**
   * Short bio/professional background summary
   */
  bio: string;

  /**
   * Array of Service IDs (`Service.id`) that this therapist is qualified to perform.
   * Enables optimal Firestore searches like:
   * `where('specialties', 'array-contains', serviceId)` to find eligible therapists.
   */
  specialties: string[];

  /**
   * Status indicating if the therapist is currently active on the staff
   */
  isActive: boolean;

  /**
   * URL to professional avatar photo
   */
  avatarUrl?: string;

  /**
   * Object position for image framing (e.g. '50% 30%' or 'center top')
   */
  imagePosition?: string;

  /**
   * Zoom factor for image framing (e.g. 1.0 to 2.5)
   */
  imageZoom?: number;

  /**
   * Percentage of commission paid to this therapist for each executed massage (0-100)
   */
  commissionPercentage?: number;

  /**
   * Pagar.me Recipient ID (ID de recebedor na Pagar.me para split de pagamentos)
   */
  pagarmeRecipientId?: string;

  /**
   * Tax CPF identifier for Pagar.me integration and KYC
   */
  cpf?: string;

  /**
   * Date of birth
   */
  birthDate?: string;

  /**
   * Creation timestamp (Firestore Timestamp)
   */
  createdAt: any;

  /**
   * Last update timestamp (Firestore Timestamp)
   */
  updatedAt: any;
}
