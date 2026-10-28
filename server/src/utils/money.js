/**
 * Financial calculation utilities for integer paise.
 * 1 INR (Rupee) = 100 Paise.
 * All monetary storage and balance calculations MUST use integer paise
 * to eliminate IEEE 754 floating point rounding inaccuracies.
 */

/**
 * Converts a rupee amount (number or string, e.g. 125.50 or "125.50") into integer paise (12550).
 * Uses Math.round to prevent floating-point precision issues like 19.99 * 100 = 1998.9999999999998.
 */
function rupeesToPaise(rupees) {
  if (rupees === null || rupees === undefined || rupees === '') {
    throw new Error('Amount is required');
  }
  const parsed = typeof rupees === 'number' ? rupees : parseFloat(String(rupees).replace(/,/g, ''));
  if (isNaN(parsed) || !isFinite(parsed)) {
    throw new Error('Invalid rupee amount: must be a finite number');
  }
  return Math.round(parsed * 100);
}

/**
 * Converts integer paise to a 2-decimal rupee string, e.g. 12550 -> "125.50"
 */
function paiseToRupees(paise) {
  if (typeof paise !== 'number' || !Number.isInteger(paise)) {
    paise = parseInt(paise, 10);
    if (isNaN(paise)) return '0.00';
  }
  return (paise / 100).toFixed(2);
}

/**
 * Formats integer paise into a human-readable rupee string with currency symbol,
 * e.g. 12550 -> "₹125.50" or -5000 -> "-₹50.00"
 */
function formatRupees(paise) {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupeesStr = paiseToRupees(absPaise);
  const parts = rupeesStr.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian number formatting for commas: e.g. 1,00,000.00
  let formattedInteger = integerPart;
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  const result = `₹${formattedInteger}.${decimalPart}`;
  return isNegative ? `-${result}` : result;
}

/**
 * Validates that an amount in paise is positive, integer, and finite.
 */
function validatePositivePaise(paise, fieldName = 'Amount') {
  if (typeof paise !== 'number' || !Number.isInteger(paise)) {
    throw new Error(`${fieldName} must be an integer paise value`);
  }
  if (paise <= 0) {
    throw new Error(`${fieldName} must be strictly greater than 0 paise`);
  }
  if (!Number.isSafeInteger(paise)) {
    throw new Error(`${fieldName} exceeds safe integer limits`);
  }
  return true;
}

/**
 * Calculates an equal split among participants.
 * Leftover paise are distributed deterministically (1 paise each to the first R participants)
 * so that the sum of shares is guaranteed to equal totalAmountPaise exactly.
 *
 * Example: 100 paise split among 3 users:
 * Base share: 33 paise
 * Remainder: 100 % 3 = 1 paise
 * User 1: 34 paise
 * User 2: 33 paise
 * User 3: 33 paise
 * Sum: 34 + 33 + 33 = 100 paise.
 */
function calculateEqualSplit(totalAmountPaise, participantIds) {
  validatePositivePaise(totalAmountPaise, 'Total amount');
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    throw new Error('At least one participant is required for equal split');
  }

  const n = participantIds.length;
  const baseShare = Math.floor(totalAmountPaise / n);
  const remainder = totalAmountPaise % n;

  return participantIds.map((userId, index) => {
    const amountPaise = index < remainder ? baseShare + 1 : baseShare;
    return {
      user: userId,
      amountPaise,
      percentage: Number(((amountPaise / totalAmountPaise) * 100).toFixed(2))
    };
  });
}

/**
 * Validates an exact split.
 * Ensures every participant has a non-negative integer amount and the sum equals totalAmountPaise.
 */
function validateAndProcessExactSplit(totalAmountPaise, rawSplits) {
  validatePositivePaise(totalAmountPaise, 'Total amount');
  if (!Array.isArray(rawSplits) || rawSplits.length === 0) {
    throw new Error('Exact split must contain participant shares');
  }

  let runningTotal = 0;
  const processed = rawSplits.map((item, index) => {
    if (!item.user) {
      throw new Error(`Participant missing at index ${index}`);
    }
    const amountPaise = typeof item.amountPaise === 'number' 
      ? item.amountPaise 
      : rupeesToPaise(item.amountRupees ?? item.amount ?? 0);

    if (typeof amountPaise !== 'number' || !Number.isInteger(amountPaise) || amountPaise < 0) {
      throw new Error(`Invalid share for participant: must be a non-negative integer paise`);
    }

    runningTotal += amountPaise;
    return {
      user: item.user,
      amountPaise,
      percentage: totalAmountPaise > 0 ? Number(((amountPaise / totalAmountPaise) * 100).toFixed(2)) : 0
    };
  });

  if (runningTotal !== totalAmountPaise) {
    throw new Error(
      `Sum of exact splits (${formatRupees(runningTotal)}) does not match total amount (${formatRupees(totalAmountPaise)})`
    );
  }

  return processed;
}

/**
 * Calculates a percentage split.
 * Percentages must total 100%. Leftover paise resulting from floor operations
 * are distributed deterministically so that the sum of shares is guaranteed to equal totalAmountPaise.
 */
function calculatePercentageSplit(totalAmountPaise, rawSplits) {
  validatePositivePaise(totalAmountPaise, 'Total amount');
  if (!Array.isArray(rawSplits) || rawSplits.length === 0) {
    throw new Error('Percentage split must contain participant shares');
  }

  // Sum percentages
  let totalPercentage = 0;
  for (const item of rawSplits) {
    const pct = parseFloat(item.percentage);
    if (isNaN(pct) || pct < 0) {
      throw new Error('Each participant percentage must be a non-negative number');
    }
    totalPercentage += pct;
  }

  // Allow negligible floating point delta for percentages summing to 100 (e.g. 99.999 to 100.001)
  if (Math.abs(totalPercentage - 100) > 0.05) {
    throw new Error(`Percentages must sum to 100% (currently ${totalPercentage.toFixed(2)}%)`);
  }

  // Compute preliminary shares and fractional remainder parts
  let allocatedPaise = 0;
  const preliminary = rawSplits.map((item, index) => {
    const pct = parseFloat(item.percentage);
    const rawPaise = (totalAmountPaise * pct) / 100;
    const floorPaise = Math.floor(rawPaise);
    const fractionalPart = rawPaise - floorPaise;
    allocatedPaise += floorPaise;
    return {
      user: item.user,
      floorPaise,
      fractionalPart,
      percentage: pct,
      index
    };
  });

  // Distribute leftover paise
  let leftoverPaise = totalAmountPaise - allocatedPaise;
  // Sort by highest fractional remainder first to give extra paise where it's closest to the next round paise
  const sortedByFraction = [...preliminary].sort((a, b) => b.fractionalPart - a.fractionalPart);

  const finalSplits = new Array(rawSplits.length);

  for (let i = 0; i < sortedByFraction.length; i++) {
    const item = sortedByFraction[i];
    let extra = 0;
    if (leftoverPaise > 0) {
      extra = 1;
      leftoverPaise -= 1;
    }
    finalSplits[item.index] = {
      user: item.user,
      amountPaise: item.floorPaise + extra,
      percentage: item.percentage
    };
  }

  // Double check sum
  const sumFinal = finalSplits.reduce((acc, curr) => acc + curr.amountPaise, 0);
  if (sumFinal !== totalAmountPaise) {
    throw new Error('Internal error in percentage split distribution');
  }

  return finalSplits;
}

module.exports = {
  rupeesToPaise,
  paiseToRupees,
  formatRupees,
  validatePositivePaise,
  calculateEqualSplit,
  validateAndProcessExactSplit,
  calculatePercentageSplit
};
