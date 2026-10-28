const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const { generateGroupSettlementPlan } = require('../services/settlementService');
const { calculateGroupBalances } = require('../services/balanceService');
const { rupeesToPaise } = require('../utils/money');

// @desc    Get debt simplification settlement plan for a group
// @route   GET /api/settlements/plan/:groupId
// @access  Private (group member only)
const getSettlementPlan = async (req, res, next) => {
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

    const plan = await generateGroupSettlementPlan(groupId);

    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record an actual payment / settlement between two members
// @route   POST /api/settlements
// @access  Private (group member only)
const recordSettlement = async (req, res, next) => {
  try {
    const {
      groupId,
      fromUserId,
      toUserId,
      amount,
      amountPaise,
      notes = '',
      date
    } = req.body;

    if (!groupId || !fromUserId || !toUserId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID, fromUserId (payer), and toUserId (recipient) are required'
      });
    }

    if (fromUserId.toString() === toUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Payer and recipient cannot be the same user'
      });
    }

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

    // Both payer and recipient must belong to the group
    const fromInGroup = group.members.some((m) => m.toString() === fromUserId.toString());
    const toInGroup = group.members.some((m) => m.toString() === toUserId.toString());

    if (!fromInGroup || !toInGroup) {
      return res.status(400).json({
        success: false,
        message: 'Both payer and recipient must be active members of the group'
      });
    }

    let finalAmountPaise;
    if (typeof amountPaise === 'number' && Number.isInteger(amountPaise)) {
      finalAmountPaise = amountPaise;
    } else if (amount !== undefined && amount !== null) {
      finalAmountPaise = rupeesToPaise(amount);
    } else {
      return res.status(400).json({ success: false, message: 'Settlement amount is required' });
    }

    if (finalAmountPaise <= 0) {
      return res.status(400).json({ success: false, message: 'Settlement amount must be greater than zero' });
    }

    const settlement = await Settlement.create({
      group: groupId,
      fromUser: fromUserId,
      toUser: toUserId,
      amountPaise: finalAmountPaise,
      notes: notes.trim(),
      date: date ? new Date(date) : new Date(),
      creator: req.user._id
    });

    const populated = await Settlement.findById(settlement._id)
      .populate('fromUser', 'name email avatar')
      .populate('toUser', 'name email avatar')
      .populate('creator', 'name email avatar');

    const updatedBalances = await calculateGroupBalances(groupId);

    res.status(201).json({
      success: true,
      message: 'Settlement payment recorded successfully',
      data: {
        settlement: populated,
        updatedBalances
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all recorded settlements for a group
// @route   GET /api/settlements/group/:groupId
// @access  Private (group member only)
const getGroupSettlements = async (req, res, next) => {
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

    const settlements = await Settlement.find({ group: groupId })
      .populate('fromUser', 'name email avatar')
      .populate('toUser', 'name email avatar')
      .populate('creator', 'name email avatar')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { settlements }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a recorded settlement
// @route   DELETE /api/settlements/:id
// @access  Private (group member only)
const deleteSettlement = async (req, res, next) => {
  try {
    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement record not found' });
    }

    const group = await Group.findById(settlement.group);
    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this settlement'
      });
    }

    const groupId = settlement.group;
    await Settlement.findByIdAndDelete(settlement._id);

    const updatedBalances = await calculateGroupBalances(groupId);

    res.status(200).json({
      success: true,
      message: 'Settlement deleted successfully',
      data: { updatedBalances }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettlementPlan,
  recordSettlement,
  getGroupSettlements,
  deleteSettlement
};
