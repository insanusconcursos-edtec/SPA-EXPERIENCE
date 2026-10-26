/**
 * Enums representing appointment status and payment states
 */
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed';
export type PaymentMethod = 'credit_card' | 'pix' | 'boleto';

export interface AppointmentAdditionalService {
  /**
   * Reference to the AdditionalService ID
   */
  id: string;

  /**
   * Snapshot of the name at booking time (denormalized)
   */
  name: string;

  /**
   * Snapshot of the price at booking time (cents, denormalized)
   */
  price: number;

  /**
   * Duration in minutes that this service added
   */
  durationMinutes: number;
}

/**
 * Interface representing an Appointment (Agendamento) in the SPA EXPERIENCE system.
 */
export interface Appointment {
  /**
   * Unique identifier of the appointment
   */
  id: string;

  /**
   * Reference to the client (`User.uid`)
   */
  clientId: string;

  /**
   * Denormalized client name for quick queries without extra document fetches
   */
  clientName: string;

  /**
   * Denormalized client email
   */
  clientEmail: string;

  /**
   * Reference to the therapist (`Therapist.id`)
   */
  therapistId: string;

  /**
   * Denormalized therapist name for fast rendering in dashboard listings
   */
  therapistName: string;

  /**
   * Reference to the main service (`Service.id`)
   */
  serviceId: string;

  /**
   * Denormalized main service name
   */
  serviceName: string;

  /**
   * Main service duration in minutes at the time of booking
   */
  serviceDuration: number;

  /**
   * Buffer/preparation duration in minutes associated with this service
   */
  preparationDuration: number;

  /**
   * Sub-list of snapshot upsell additional services selected
   */
  additionalServices: AppointmentAdditionalService[];

  /**
   * Targeted date in local ISO string format 'YYYY-MM-DD'
   * Essential for daily calendar querying and daily/monthly metrics aggregation.
   */
  date: string;

  /**
   * Start date and time of the massage session (Firestore Timestamp)
   */
  startTime: any;

  /**
   * End date and time of the massage session (Firestore Timestamp)
   * Formula: startTime + (serviceDuration + additionalServices[n].duration) in milliseconds
   */
  endTime: any;

  /**
   * Sum of all durations in minutes (serviceDuration + sum(additionalServices duration))
   */
  totalDurationMinutes: number;

  /**
   * Snapshot base price of the main service in cents
   */
  basePrice: number;

  /**
   * Sum of all prices of additional services in cents
   */
  additionalPrice: number;

  /**
   * Total price of the appointment in cents (basePrice + additionalPrice)
   * Key metric for billing/revenue dashboards.
   */
  totalPrice: number;

  /**
   * Booking reservation status
   */
  status: AppointmentStatus;

  /**
   * Payment tracking state
   */
  paymentStatus: PaymentStatus;

  /**
   * Struct holding integration details for payment gateways (e.g., Pagar.me)
   */
  paymentGatewayDetails?: {
    /**
     * Transaction ID in Pagar.me system
     */
    transactionId: string;

    /**
     * Chosen payment vehicle
     */
    paymentMethod: PaymentMethod;

    /**
     * Timestamp of payment success (Firestore Timestamp)
     */
    paidAt?: any;

    /**
     * Raw status returned by the Pagar.me API (e.g., 'paid', 'refused', 'processing')
     */
    gatewayStatus?: string;
  };

  /**
   * Reason why the appointment was cancelled (if cancelled)
   */
  cancellationReason?: string;

  /**
   * Timestamp of cancellation (Firestore Timestamp)
   * Used with startTime for enforcing the strict 24h cancellation security window rule.
   */
  cancelledAt?: any;

  /**
   * Creation timestamp (Firestore Timestamp)
   */
  createdAt: any;

  /**
   * Last update timestamp (Firestore Timestamp)
   */
  updatedAt: any;

  /**
   * Optional client contact and CPF details saved on manual appointments or fetched dynamically
   */
  clientPhone?: string;
  clientCpf?: string;

  /**
   * Pagar.me transaction fee and split indicators (Cents)
   */
  pagarmeFee?: number;
  netAmount?: number;
  therapistCommissionPercentage?: number;
  therapistShare?: number;
  spaShare?: number;
  paymentInstallments?: number;
}
