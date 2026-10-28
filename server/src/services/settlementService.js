const { calculateGroupBalances } = require('./balanceService');

/**
 * Pure algorithm for debt simplification / settlement planning.
 *
 * Algorithm description:
 * 1. Filter members into:
 *    - Debtors: members with netBalancePaise < 0 (they owe money)
 *    - Creditors: members with netBalancePaise > 0 (they are owed money)
 *    - Settled: members with netBalancePaise === 0
 * 2. Order debtors and creditors by amount descending.
 * 3. Greedily match the largest debtor with the largest creditor:
 *    - Transfer amount = min(debtor.debt, creditor.credit).
 *    - Add transaction { from: debtor.user, to: creditor.user, amountPaise: transferAmount }.
 *    - Subtract transfer amount from debtor's remaining debt and creditor's remaining credit.
 *    - Advance pointers when balance reaches zero.
 * 4. Guarantee:
 *    - Every member's remaining balance terminates at exactly 0 paise.
 *    - Total transferred from debtors equals total received by creditors.
 *    - Generates at most (N - 1) transactions, where N is the number of active participants.
 *
 * Complexity and Theoretical Limitation Note:
 * The debt simplification problem of finding the *absolute minimum* number of transactions
 * across arbitrary groups is proven to be NP-complete (isomorphic to the Subset Sum /
 * Partition Problem). For instance, if user A owes 10, user B owes 20, user C is owed 10,
 * and user D is owed 20, an optimal partition creates 2 disjoint transactions (A->C: 10, B->D: 20).
 * A purely greedy approach without subset decomposition might produce 2 or 3 transactions.
 * This greedy implementation achieves a provable upper bound of (N - 1) transactions,
 * guarantees deterministic integer precision with zero rounding error, operates in O(N log N)
 * time, and is the industry-standard algorithm used by fintech apps like Splitwise.
 *
 * @param {Array} memberBalances - Array of { user, netBalancePaise }
 * @returns {Array} List of simplified transactions: [{ from, to, amountPaise }]
 */
function simplifyDebts(memberBalances) {
  if (!Array.isArray(memberBalances) || memberBalances.length === 0) {
    return [];
  }

  // Clone entries to avoid mutating caller objects
  const debtors = [];
  const creditors = [];

  let totalDebt = 0;
  let totalCredit = 0;

  for (const item of memberBalances) {
    const net = item.netBalancePaise || 0;
    if (net < 0) {
      const debt = Math.abs(net);
      debtors.push({ user: item.user, debt });
      totalDebt += debt;
    } else if (net > 0) {
      creditors.push({ user: item.user, credit: net });
      totalCredit += net;
    }
  }

  // Sanity check for total balance consistency
  if (totalDebt !== totalCredit) {
    console.warn(
      `[Settlement Warning] Total debt (${totalDebt} paise) does not equal total credit (${totalCredit} paise)`
    );
  }

  // If no debtors or creditors, all members are already settled
  if (debtors.length === 0 || creditors.length === 0) {
    return [];
  }

  // Sort descending by value to minimize the number of transfers
  debtors.sort((a, b) => b.debt - a.debt);
  creditors.sort((a, b) => b.credit - a.credit);

  const transactions = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const amountPaise = Math.min(debtor.debt, creditor.credit);

    if (amountPaise > 0) {
      transactions.push({
        from: debtor.user,
        to: creditor.user,
        amountPaise
      });

      debtor.debt -= amountPaise;
      creditor.credit -= amountPaise;
    }

    if (debtor.debt === 0) {
      d++;
    }
    if (creditor.credit === 0) {
      c++;
    }
  }

  // Assert that all debt and credit have been cleared
  const remainingDebt = debtors.reduce((sum, item) => sum + item.debt, 0);
  const remainingCredit = creditors.reduce((sum, item) => sum + item.credit, 0);

  if (remainingDebt !== 0 || remainingCredit !== 0) {
    throw new Error('Settlement algorithm failed to clear all member balances');
  }

  return transactions;
}

/**
 * Generates a full settlement plan for a given group.
 */
async function generateGroupSettlementPlan(groupId) {
  const { group, memberBalances, totalGroupExpensePaise } = await calculateGroupBalances(groupId);
  const settlementPlan = simplifyDebts(memberBalances);

  // Separate summary of creditors and debtors for easy display
  const creditors = memberBalances
    .filter((m) => m.netBalancePaise > 0)
    .map((m) => ({ user: m.user, amountPaise: m.netBalancePaise }));

  const debtors = memberBalances
    .filter((m) => m.netBalancePaise < 0)
    .map((m) => ({ user: m.user, amountPaise: Math.abs(m.netBalancePaise) }));

  const settledMembers = memberBalances
    .filter((m) => m.netBalancePaise === 0)
    .map((m) => ({ user: m.user }));

  return {
    group,
    totalGroupExpensePaise,
    settlementPlan,
    creditors,
    debtors,
    settledMembers,
    algorithm: {
      type: 'Greedy Minimum-Payment Debt Simplification',
      timeComplexity: 'O(N log N)',
      guarantee: 'Clears all member debts in at most N - 1 transactions with 0 paise rounding error'
    }
  };
}

module.exports = {
  simplifyDebts,
  generateGroupSettlementPlan
};
