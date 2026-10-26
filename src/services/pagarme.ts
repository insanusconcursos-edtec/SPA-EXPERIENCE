/**
 * Stone Pagar.me Fee Calculation & Split Logic
 * Grounded strictly in the agreed contract rates (TAXAS PAGARME.jpeg)
 */

export interface PagarmeSplitResult {
  pagarmeFee: number; // in cents
  netAmount: number; // in cents
  therapistShare: number; // in cents
  spaShare: number; // in cents
  therapistCommissionPercentage: number;
}

/**
 * Calculates the exact fee charged by Pagar.me for a transaction (in cents).
 * 
 * Rates from contract:
 * - Pix: 0.80% (no fixed fee)
 * - Credit Card:
 *   - Gateway: R$ 0.35 (35 cents)
 *   - Antifraude: R$ 0.35 (35 cents)
 *   - Fixed Fee Total = R$ 0.70 (70 cents)
 *   - Custo Efetivo Total (MDR + Antecipação Automática):
 *     - 1x (Crédito à vista): 5.77%
 *     - 2x: 7.38%
 *     - 3x: 8.51%
 *     - 4x: 9.64%
 *     - 5x: 10.76%
 *     - 6x: 11.89%
 *     - 7x: 13.27%
 *     - 8x: 14.40%
 *     - 9x: 15.52%
 *     - 10x: 16.65%
 *     - 11x: 17.77%
 *     - 12x: 18.90%
 */
export const calculatePagarmeFee = (totalPriceCents: number, method: 'pix' | 'card', installments: number = 1): number => {
  if (method === 'pix') {
    // Pix: 0.80% rate
    return Math.round(totalPriceCents * 0.008);
  } else {
    // Credit Card fixed fees: Gateway R$ 0.35 + Antifraude R$ 0.35 = R$ 0.70 (70 cents)
    const fixedFee = 70;
    
    // Custo Efetivo Total percentage based on installment count
    let percentage = 0.0577; // Default 1x
    switch (installments) {
      case 1: percentage = 0.0577; break;
      case 2: percentage = 0.0738; break;
      case 3: percentage = 0.0851; break;
      case 4: percentage = 0.0964; break;
      case 5: percentage = 0.1076; break;
      case 6: percentage = 0.1189; break;
      case 7: percentage = 0.1327; break;
      case 8: percentage = 0.1440; break;
      case 9: percentage = 0.1552; break;
      case 10: percentage = 0.1665; break;
      case 11: percentage = 0.1777; break;
      case 12: percentage = 0.1890; break;
      default: percentage = 0.0577;
    }
    
    return Math.round(totalPriceCents * percentage) + fixedFee;
  }
};

/**
 * Calculates the net amount after Pagar.me fee deductions and splits the remainder
 * between the Therapist and the Spa according to their agreed commission percentage.
 */
export const calculateSplit = (
  totalPriceCents: number,
  method: 'pix' | 'card',
  installments: number = 1,
  therapistCommissionPercentage: number = 30
): PagarmeSplitResult => {
  const pagarmeFee = calculatePagarmeFee(totalPriceCents, method, installments);
  const netAmount = Math.max(0, totalPriceCents - pagarmeFee);
  
  // Rule: divide the NET amount (after Pagar.me rates) between Therapist and Spa
  const therapistShare = Math.round(netAmount * (therapistCommissionPercentage / 100));
  const spaShare = Math.max(0, netAmount - therapistShare);
  
  return {
    pagarmeFee,
    netAmount,
    therapistShare,
    spaShare,
    therapistCommissionPercentage
  };
};
