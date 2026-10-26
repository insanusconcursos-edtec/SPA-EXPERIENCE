/**
 * Struct representing operational time windows
 * E.g., "08:00" to "12:00" or "13:00" to "18:00"
 */
export interface TimeInterval {
  /**
   * Start time in "HH:MM" format (24-hour, e.g., "08:00")
   */
  start: string;

  /**
   * End time in "HH:MM" format (24-hour, e.g., "17:00")
   */
  end: string;
}

export interface DaySchedule {
  /**
   * Day of week index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
   */
  dayOfWeek: number;

  /**
   * Flag indicating if open/working on this day
   */
  isOpen: boolean;

  /**
   * Active slots or shifts (e.g., 08:00-12:00, 13:00-18:00)
   */
  intervals: TimeInterval[];
}

/**
 * Global setting in `/config/opening_hours` representing the spa's weekly operational hours.
 */
export interface BusinessOpeningHours {
  /**
   * ID is typically 'opening_hours'
   */
  id: string;

  /**
   * Configuration for each of the 7 days of the week
   */
  weeklySchedule: DaySchedule[];

  /**
   * Last modified timestamp (Firestore Timestamp)
   */
  updatedAt: any;
}

/**
 * Standard working schedule for a Therapist stored at: `/therapist_schedules/{therapistId}`
 * Denotes the regular weekly availability pattern of each massoterapeuta.
 */
export interface TherapistWeeklySchedule {
  /**
   * ID of the therapist linked to this schedule (matches therapistId)
   */
  therapistId: string;

  /**
   * Working intervals for each day of the week
   */
  weeklySchedule: DaySchedule[];

  /**
   * Last update timestamp (Firestore Timestamp)
   */
  updatedAt: any;
}

/**
 * Custom off-time blockouts or absences for Therapists stored in a root collection: `/therapist_absences/{absenceId}`
 * Prevents clients from booking when a therapist is on vacation, sick leave, or has a scheduled personal break.
 * Storing in a root collection facilitates easy indexing and range queries for checkouts.
 */
export interface TherapistAbsence {
  /**
   * Unique identifier of the blockout/absence
   */
  id: string;

  /**
   * Reference to the therapist (`Therapist.id`)
   */
  therapistId: string;

  /**
   * Start of the blockout interval (Firestore Timestamp)
   */
  start: any;

  /**
   * End of the blockout interval (Firestore Timestamp)
   */
  end: any;

  /**
   * Reason for unavailability
   */
  reason: 'vacation' | 'sick' | 'personal' | 'custom';

  /**
   * Short optional note about the absence
   */
  notes?: string;

  /**
   * Creation timestamp (Firestore Timestamp)
   */
  createdAt: any;
}
