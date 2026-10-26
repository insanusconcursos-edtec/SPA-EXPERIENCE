/**
 * Interface representing a User in the SPA EXPERIENCE system.
 * Designed in compliance with LGPD (Lei Geral de Proteção de Dados).
 */

export type UserRole = 'client' | 'admin';

export interface User {
  /**
   * Unique identifier (matches Firebase Auth UID)
   */
  uid: string;

  /**
   * User's full name
   */
  name: string;

  /**
   * User's contact email
   */
  email: string;

  /**
   * Access privileges within the platform
   */
  role: UserRole;

  /**
   * System account creation date (Firestore Timestamp)
   */
  createdAt: any;

  /**
   * Last update date (Firestore Timestamp)
   */
  updatedAt: any;
}

/**
 * Isolated Sensitive Personal Data (PII) subcollection: `/users/{userId}/private/info`
 * Isolating PII enforces Zero-Trust security rules and prevents accidental leaks
 * during listing or user data sharing workflows.
 */
export interface PrivateUserInfo {
  /**
   * User contact phone (PII)
   */
  phone: string;

  /**
   * AES-256 Encrypted CPF (Sensitive PII).
   * Decrypted ONLY on secure backend environments or by the authorized user's client.
   */
  encryptedCpf: string;

  /**
   * SHA-256 One-Way Hash of the CPF.
   * Used for uniqueness validation searches (e.g., checking if a CPF is already registered)
   * without having to decrypt or expose the plaintext CPF in queries.
   */
  cpfHash: string;
}
