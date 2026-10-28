const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');

/**
 * Calculates net balances for all members in a given group.
 * 
 * Net balance definition:
 * Net Balance = (Total amount paid by member for expenses + Total settlements sent by member)
 *             - (Total share of expenses owed by member + Total settlements received by member)
 *
 * If Net Balance > 0: Member is a Creditor (they are owed money)
 * If Net Balance < 0: Member is a Debtor (they owe money)
 * If Net Balance = 0: Member is settled up
 * 
 * All arithmetic strictly uses integer paise.
 */
async function calculateGroupBalances(groupId) {
  const group = await Group.findById(groupId).populate('members', 'name email avatar');
  if (!group) {
    throw new Error('Group not found');
  }

  // Map of userId string -> member balance object
  const balances = new Map();

  for (const member of group.members) {
    balances.set(member._id.toString(), {
      user: {
        _id: member._id,
        name: member.name,
        email: member.email,
        avatar: member.avatar
      },
      netBalancePaise: 0,
      totalPaidPaise: 0,
      totalOwedPaise: 0,
      settlementsPaidPaise: 0,
      settlementsReceivedPaise: 0
    });
  }

  // 1. Fetch all expenses for this group
  const expenses = await Expense.find({ group: groupId });
  let totalGroupExpensePaise = 0;

  for (const exp of expenses) {
    totalGroupExpensePaise += exp.totalAmountPaise;

    const payerId = exp.payer.toString();
    if (balances.has(payerId)) {
      const payerRecord = balances.get(payerId);
      payerRecord.totalPaidPaise += exp.totalAmountPaise;
      payerRecord.netBalancePaise += exp.totalAmountPaise;
    }

    for (const split of exp.splits) {
      const splitUserId = split.user.toString();
      if (balances.has(splitUserId)) {
        const splitRecord = balances.get(splitUserId);
        splitRecord.totalOwedPaise += split.amountPaise;
        splitRecord.netBalancePaise -= split.amountPaise;
      }
    }
  }

  // 2. Fetch all recorded settlements for this group
  const settlements = await Settlement.find({ group: groupId });

  for (const st of settlements) {
    const fromId = st.fromUser.toString();
    const toId = st.toUser.toString();

    // FromUser paid money to ToUser
    if (balances.has(fromId)) {
      const fromRecord = balances.get(fromId);
      fromRecord.settlementsPaidPaise += st.amountPaise;
      fromRecord.netBalancePaise += st.amountPaise; // paying off debt increases net balance toward 0
    }

    if (balances.has(toId)) {
      const toRecord = balances.get(toId);
      toRecord.settlementsReceivedPaise += st.amountPaise;
      toRecord.netBalancePaise -= st.amountPaise; // receiving settlement reduces remaining credit toward 0
    }
  }

  const memberBalances = Array.from(balances.values());

  // Integrity assertion: sum of all net balances must equal 0 paise
  const sumNetBalances = memberBalances.reduce((acc, m) => acc + m.netBalancePaise, 0);
  if (sumNetBalances !== 0) {
    console.warn(`[Balance Warning] Sum of net balances is ${sumNetBalances} paise instead of 0 in group ${groupId}`);
  }

  return {
    group: {
      _id: group._id,
      name: group.name,
      description: group.description,
      creator: group.creator
    },
    totalGroupExpensePaise,
    memberBalances
  };
}

/**
 * Calculates a single user's aggregate balance summary across all groups they belong to.
 */
async function calculateUserOverallBalances(userId) {
  const groups = await Group.find({ members: userId }).select('_id');
  const groupIds = groups.map((g) => g._id);

  let totalNetBalancePaise = 0;
  let totalYouAreOwedPaise = 0;
  let totalYouOwePaise = 0;

  for (const gid of groupIds) {
    const { memberBalances } = await calculateGroupBalances(gid);
    const myBalance = memberBalances.find((m) => m.user._id.toString() === userId.toString());
    if (myBalance) {
      totalNetBalancePaise += myBalance.netBalancePaise;
      if (myBalance.netBalancePaise > 0) {
        totalYouAreOwedPaise += myBalance.netBalancePaise;
      } else if (myBalance.netBalancePaise < 0) {
        totalYouOwePaise += Math.abs(myBalance.netBalancePaise);
      }
    }
  }

  return {
    totalNetBalancePaise,
    totalYouAreOwedPaise,
    totalYouOwePaise
  };
}

module.exports = {
  calculateGroupBalances,
  calculateUserOverallBalances
};
