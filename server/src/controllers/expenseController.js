const Expense = require('../models/Expense');
const Group = require('../models/Group');
const {
  rupeesToPaise,
  calculateEqualSplit,
  validateAndProcessExactSplit,
  calculatePercentageSplit
} = require('../utils/money');
const { calculateGroupBalances } = require('../services/balanceService');

// Helper to validate and calculate splits based on splitType
function processSplits(splitType, totalAmountPaise, rawSplits, participantIds) {
  switch (splitType) {
    case 'EQUAL': {
      if (!participantIds || participantIds.length === 0) {
        throw new Error('At least one participant must be selected for equal split');
      }
      return calculateEqualSplit(totalAmountPaise, participantIds);
    }
    case 'EXACT': {
      return validateAndProcessExactSplit(totalAmountPaise, rawSplits);
    }
    case 'PERCENTAGE': {
      return calculatePercentageSplit(totalAmountPaise, rawSplits);
    }
    default:
      throw new Error(`Unsupported split type: ${splitType}. Must be EQUAL, EXACT, or PERCENTAGE`);
  }
}

// @desc    Create a new expense
// @route   POST /api/expenses
// @access  Private (group member only)
const createExpense = async (req, res, next) => {
  try {
    const {
      groupId,
      description,
      amount, // In rupees (float/number/string) OR amountPaise
      amountPaise,
      payerId,
      splitType = 'EQUAL',
      participants,
      splits,
      category = 'General',
      date,
      notes = ''
    } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, message: 'Group ID is required' });
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Expense description is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Verify creator is a member of the group
    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not a member of this group'
      });
    }

    // Determine totalAmountPaise using integer conversion
    let totalPaise;
    if (typeof amountPaise === 'number' && Number.isInteger(amountPaise)) {
      totalPaise = amountPaise;
    } else if (amount !== undefined && amount !== null) {
      totalPaise = rupeesToPaise(amount);
    } else {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    if (totalPaise <= 0) {
      return res.status(400).json({ success: false, message: 'Expense amount must be greater than zero' });
    }

    // Determine payer
    const payer = payerId || req.user._id;
    // Payer must be a group member
    if (!group.members.some((m) => m.toString() === payer.toString())) {
      return res.status(400).json({ success: false, message: 'Payer must be a member of the group' });
    }

    // Process participants and splits
    let processedSplits;
    let participantList = participants;

    if (splitType === 'EQUAL') {
      if (!participantList || participantList.length === 0) {
        // Default to all group members if not specified
        participantList = group.members.map((m) => m.toString());
      }
    } else {
      // For EXACT and PERCENTAGE, participants come from splits array
      if (!Array.isArray(splits) || splits.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Splits configuration is required for ${splitType} split`
        });
      }
      participantList = splits.map((s) => s.user.toString());
    }

    // Verify all participants are members of the group
    for (const pId of participantList) {
      if (!group.members.some((m) => m.toString() === pId.toString())) {
        return res.status(400).json({
          success: false,
          message: `Participant ${pId} is not a member of this group`
        });
      }
    }

    processedSplits = processSplits(splitType, totalPaise, splits, participantList);

    const expense = await Expense.create({
      group: groupId,
      description: description.trim(),
      totalAmountPaise: totalPaise,
      payer,
      participants: participantList,
      splitType,
      splits: processedSplits,
      category,
      date: date ? new Date(date) : new Date(),
      notes: notes.trim(),
      creator: req.user._id
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('payer', 'name email avatar')
      .populate('creator', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    // Recalculate balances
    const updatedBalances = await calculateGroupBalances(groupId);

    res.status(201).json({
      success: true,
      message: 'Expense added successfully',
      data: {
        expense: populatedExpense,
        updatedBalances
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all expenses for a group
// @route   GET /api/expenses/group/:groupId
// @access  Private (group member only)
const getGroupExpenses = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not a member of this group'
      });
    }

    const expenses = await Expense.find({ group: groupId })
      .populate('payer', 'name email avatar')
      .populate('creator', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { expenses }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single expense details
// @route   GET /api/expenses/:id
// @access  Private
const getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('group', 'name members')
      .populate('payer', 'name email avatar')
      .populate('creator', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    // Verify requesting user is member of the group
    const isMember = expense.group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not a member of this group'
      });
    }

    res.status(200).json({
      success: true,
      data: { expense }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an expense
// @route   PUT /api/expenses/:id
// @access  Private (group member only)
const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const group = await Group.findById(expense.group);
    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to edit this expense'
      });
    }

    const {
      description,
      amount,
      amountPaise,
      payerId,
      splitType,
      participants,
      splits,
      category,
      date,
      notes
    } = req.body;

    if (description !== undefined) {
      if (!description.trim()) {
        return res.status(400).json({ success: false, message: 'Description cannot be empty' });
      }
      expense.description = description.trim();
    }

    // Determine new totalAmountPaise if amount was provided
    let totalPaise = expense.totalAmountPaise;
    if (typeof amountPaise === 'number' && Number.isInteger(amountPaise)) {
      totalPaise = amountPaise;
    } else if (amount !== undefined && amount !== null) {
      totalPaise = rupeesToPaise(amount);
    }

    if (totalPaise <= 0) {
      return res.status(400).json({ success: false, message: 'Expense amount must be greater than zero' });
    }
    expense.totalAmountPaise = totalPaise;

    if (payerId) {
      if (!group.members.some((m) => m.toString() === payerId.toString())) {
        return res.status(400).json({ success: false, message: 'Payer must be a member of the group' });
      }
      expense.payer = payerId;
    }

    const effectiveSplitType = splitType || expense.splitType;
    expense.splitType = effectiveSplitType;

    let participantList = participants || expense.participants.map((p) => p.toString());
    if (splits && (effectiveSplitType === 'EXACT' || effectiveSplitType === 'PERCENTAGE')) {
      participantList = splits.map((s) => s.user.toString());
    }

    // Verify all participants are members
    for (const pId of participantList) {
      if (!group.members.some((m) => m.toString() === pId.toString())) {
        return res.status(400).json({
          success: false,
          message: `Participant ${pId} is not a member of this group`
        });
      }
    }

    const rawSplits = splits || (effectiveSplitType === expense.splitType ? expense.splits : null);
    const processedSplits = processSplits(
      effectiveSplitType,
      totalPaise,
      rawSplits,
      participantList
    );

    expense.participants = participantList;
    expense.splits = processedSplits;

    if (category) expense.category = category;
    if (date) expense.date = new Date(date);
    if (notes !== undefined) expense.notes = notes.trim();

    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('payer', 'name email avatar')
      .populate('creator', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    // Recalculate balances after update
    const updatedBalances = await calculateGroupBalances(group._id);

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: {
        expense: populated,
        updatedBalances
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private (group member only)
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const group = await Group.findById(expense.group);
    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this expense'
      });
    }

    const groupId = expense.group;
    await Expense.findByIdAndDelete(expense._id);

    // Recalculate balances after deletion
    const updatedBalances = await calculateGroupBalances(groupId);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully',
      data: { updatedBalances }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExpense,
  getGroupExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
};
