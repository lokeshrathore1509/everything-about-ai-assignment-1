const { simplifyDebts } = require('../src/services/settlementService');

describe('Settlement Algorithm: Greedy Minimum-Payment Debt Simplification', () => {
  test('returns empty array when no balances or empty group provided', () => {
    expect(simplifyDebts([])).toEqual([]);
    expect(simplifyDebts(null)).toEqual([]);
  });

  test('returns empty array when all members already have zero balance', () => {
    const balances = [
      { user: { name: 'Rahul' }, netBalancePaise: 0 },
      { user: { name: 'Priya' }, netBalancePaise: 0 }
    ];
    expect(simplifyDebts(balances)).toEqual([]);
  });

  test('simplifies a two-member scenario (1 debtor, 1 creditor)', () => {
    const balances = [
      { user: { name: 'Rahul' }, netBalancePaise: 5000 }, // +₹50.00
      { user: { name: 'Priya' }, netBalancePaise: -5000 } // -₹50.00
    ];

    const plan = simplifyDebts(balances);
    expect(plan).toHaveLength(1);
    expect(plan[0].from.name).toBe('Priya');
    expect(plan[0].to.name).toBe('Rahul');
    expect(plan[0].amountPaise).toBe(5000);
  });

  test('simplifies a complex multi-member scenario and clears all balances to zero', () => {
    // 4 members:
    // A: +3000
    // B: +2000
    // C: -4000
    // D: -1000
    // Total Credit = 5000, Total Debt = 5000
    const balances = [
      { user: { name: 'Alice' }, netBalancePaise: 3000 },
      { user: { name: 'Bob' }, netBalancePaise: 2000 },
      { user: { name: 'Charlie' }, netBalancePaise: -4000 },
      { user: { name: 'David' }, netBalancePaise: -1000 }
    ];

    const plan = simplifyDebts(balances);

    // Number of transactions must be <= N - 1 = 3
    expect(plan.length).toBeLessThanOrEqual(3);

    // Verify total transferred equals total debt (5000 paise)
    const totalTransferred = plan.reduce((sum, t) => sum + t.amountPaise, 0);
    expect(totalTransferred).toBe(5000);

    // Verify simulated execution clears every individual's balance to 0
    const netTracker = {
      Alice: 3000,
      Bob: 2000,
      Charlie: -4000,
      David: -1000
    };

    for (const tx of plan) {
      netTracker[tx.from.name] += tx.amountPaise; // payer pays debt
      netTracker[tx.to.name] -= tx.amountPaise;   // receiver gets credit
    }

    expect(netTracker.Alice).toBe(0);
    expect(netTracker.Bob).toBe(0);
    expect(netTracker.Charlie).toBe(0);
    expect(netTracker.David).toBe(0);
  });

  test('handles 1 creditor and multiple debtors correctly', () => {
    const balances = [
      { user: { name: 'Payer' }, netBalancePaise: 9000 },
      { user: { name: 'Debtor1' }, netBalancePaise: -3000 },
      { user: { name: 'Debtor2' }, netBalancePaise: -3000 },
      { user: { name: 'Debtor3' }, netBalancePaise: -3000 }
    ];

    const plan = simplifyDebts(balances);
    expect(plan).toHaveLength(3);
    for (const tx of plan) {
      expect(tx.to.name).toBe('Payer');
      expect(tx.amountPaise).toBe(3000);
    }
  });
});
