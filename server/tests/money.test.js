const {
  rupeesToPaise,
  paiseToRupees,
  formatRupees,
  calculateEqualSplit,
  validateAndProcessExactSplit,
  calculatePercentageSplit
} = require('../src/utils/money');

describe('Financial Utility: Integer Paise Precision and Splits', () => {
  describe('rupeesToPaise conversion', () => {
    test('accurately converts decimal rupees to integer paise without floating point issues', () => {
      expect(rupeesToPaise(125.5)).toBe(12550);
      expect(rupeesToPaise('125.50')).toBe(12550);
      expect(rupeesToPaise(19.99)).toBe(1999);
      expect(rupeesToPaise('1,250.75')).toBe(125075);
      expect(rupeesToPaise(0.01)).toBe(1);
    });

    test('throws error on invalid, NaN or non-finite inputs', () => {
      expect(() => rupeesToPaise('abc')).toThrow('Invalid rupee amount');
      expect(() => rupeesToPaise(null)).toThrow('Amount is required');
    });
  });

  describe('paiseToRupees & formatRupees', () => {
    test('converts paise to 2-decimal rupee string', () => {
      expect(paiseToRupees(12550)).toBe('125.50');
      expect(paiseToRupees(100)).toBe('1.00');
      expect(paiseToRupees(5)).toBe('0.05');
      expect(paiseToRupees(0)).toBe('0.00');
    });

    test('formats rupee display with Indian comma separators', () => {
      expect(formatRupees(12550)).toBe('₹125.50');
      expect(formatRupees(10000000)).toBe('₹1,00,000.00');
      expect(formatRupees(-5000)).toBe('-₹50.00');
    });
  });

  describe('calculateEqualSplit with remainder paise distribution', () => {
    test('splits 100 paise equally among 3 users with deterministic remainder allocation', () => {
      const participants = ['u1', 'u2', 'u3'];
      const splits = calculateEqualSplit(100, participants);

      expect(splits).toHaveLength(3);
      // 100 / 3 = 33 base share with 1 remainder paise.
      // u1 gets 34, u2 gets 33, u3 gets 33.
      expect(splits[0].amountPaise).toBe(34);
      expect(splits[1].amountPaise).toBe(33);
      expect(splits[2].amountPaise).toBe(33);

      const sum = splits.reduce((acc, s) => acc + s.amountPaise, 0);
      expect(sum).toBe(100);
    });

    test('splits 1000 paise among 4 users exactly with zero remainder', () => {
      const participants = ['u1', 'u2', 'u3', 'u4'];
      const splits = calculateEqualSplit(1000, participants);

      expect(splits).toHaveLength(4);
      splits.forEach((s) => expect(s.amountPaise).toBe(250));
      expect(splits.reduce((acc, s) => acc + s.amountPaise, 0)).toBe(1000);
    });

    test('throws error if participants list is empty or amount is non-positive', () => {
      expect(() => calculateEqualSplit(0, ['u1'])).toThrow();
      expect(() => calculateEqualSplit(100, [])).toThrow();
    });
  });

  describe('validateAndProcessExactSplit', () => {
    test('validates exact split when sum equals total paise', () => {
      const rawSplits = [
        { user: 'u1', amountPaise: 4000 },
        { user: 'u2', amountPaise: 6000 }
      ];
      const result = validateAndProcessExactSplit(10000, rawSplits);
      expect(result).toHaveLength(2);
      expect(result[0].amountPaise).toBe(4000);
      expect(result[1].amountPaise).toBe(6000);
    });

    test('rejects exact split when sum does not match total amount', () => {
      const rawSplits = [
        { user: 'u1', amountPaise: 4000 },
        { user: 'u2', amountPaise: 5000 }
      ];
      expect(() => validateAndProcessExactSplit(10000, rawSplits)).toThrow(/does not match/);
    });
  });

  describe('calculatePercentageSplit', () => {
    test('computes exact paise shares when percentages sum to 100%', () => {
      const totalAmountPaise = 10000; // ₹100.00
      const rawSplits = [
        { user: 'u1', percentage: 50 },
        { user: 'u2', percentage: 30 },
        { user: 'u3', percentage: 20 }
      ];
      const result = calculatePercentageSplit(totalAmountPaise, rawSplits);

      expect(result[0].amountPaise).toBe(5000);
      expect(result[1].amountPaise).toBe(3000);
      expect(result[2].amountPaise).toBe(2000);
      expect(result.reduce((a, b) => a + b.amountPaise, 0)).toBe(10000);
    });

    test('distributes fractional remainder paise deterministically in percentage splits', () => {
      const totalAmountPaise = 100; // 100 paise split 33.33%, 33.33%, 33.34%
      const rawSplits = [
        { user: 'u1', percentage: 33.33 },
        { user: 'u2', percentage: 33.33 },
        { user: 'u3', percentage: 33.34 }
      ];
      const result = calculatePercentageSplit(totalAmountPaise, rawSplits);
      const sum = result.reduce((a, b) => a + b.amountPaise, 0);

      expect(sum).toBe(100);
    });

    test('throws error if percentages do not sum to 100%', () => {
      const rawSplits = [
        { user: 'u1', percentage: 40 },
        { user: 'u2', percentage: 40 }
      ];
      expect(() => calculatePercentageSplit(10000, rawSplits)).toThrow(/must sum to 100%/);
    });
  });
});
