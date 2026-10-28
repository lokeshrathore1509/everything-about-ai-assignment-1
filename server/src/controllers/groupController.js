const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const { calculateGroupBalances } = require('../services/balanceService');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res, next) => {
  try {
    const { name, description, category, memberEmails } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    // Automatically add the creator as a member
    const memberIds = [req.user._id];

    // If additional member emails were provided at creation time
    const invalidEmails = [];
    if (Array.isArray(memberEmails) && memberEmails.length > 0) {
      for (const email of memberEmails) {
        const cleanEmail = email.toLowerCase().trim();
        if (cleanEmail === req.user.email.toLowerCase()) continue; // Skip creator duplicate

        const foundUser = await User.findOne({ email: cleanEmail });
        if (foundUser) {
          if (!memberIds.some((id) => id.toString() === foundUser._id.toString())) {
            memberIds.push(foundUser._id);
          }
        } else {
          invalidEmails.push(cleanEmail);
        }
      }
    }

    const group = await Group.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      category: category || 'Other',
      creator: req.user._id,
      members: memberIds
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('creator', 'name email avatar')
      .populate('members', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: {
        group: populatedGroup,
        invalidEmails: invalidEmails.length > 0 ? invalidEmails : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all groups the authenticated user belongs to
// @route   GET /api/groups
// @access  Private
const getUserGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('creator', 'name email avatar')
      .populate('members', 'name email avatar')
      .sort({ updatedAt: -1 });

    // Compute preview balances for each group for the dashboard cards
    const groupsWithSummary = await Promise.all(
      groups.map(async (grp) => {
        const { totalGroupExpensePaise, memberBalances } = await calculateGroupBalances(grp._id);
        const myBalanceRecord = memberBalances.find(
          (m) => m.user._id.toString() === req.user._id.toString()
        );

        return {
          ...grp.toObject(),
          totalGroupExpensePaise,
          userNetBalancePaise: myBalanceRecord ? myBalanceRecord.netBalancePaise : 0
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { groups: groupsWithSummary }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single group details by ID
// @route   GET /api/groups/:id
// @access  Private (member only)
const getGroupById = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'name email avatar')
      .populate('members', 'name email avatar');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Authorization: User must be a member
    const isMember = group.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not a member of this group'
      });
    }

    const { totalGroupExpensePaise, memberBalances } = await calculateGroupBalances(group._id);

    res.status(200).json({
      success: true,
      data: {
        group,
        totalGroupExpensePaise,
        memberBalances
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add member to group by email
// @route   POST /api/groups/:id/members
// @access  Private (member only)
const addMemberByEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Member email is required'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Verify requesting user is in the group
    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot add members to a group you do not belong to'
      });
    }

    // Find registered user by email
    const targetUser = await User.findOne({ email: cleanEmail });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: `No registered user found with email "${cleanEmail}". They must register before being added.`
      });
    }

    // Check duplicate membership
    const alreadyMember = group.members.some(
      (m) => m.toString() === targetUser._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: `${targetUser.name} (${cleanEmail}) is already a member of this group`
      });
    }

    group.members.push(targetUser._id);
    await group.save();

    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'name email avatar')
      .populate('members', 'name email avatar');

    res.status(200).json({
      success: true,
      message: `${targetUser.name} added to ${group.name}`,
      data: { group: updatedGroup, addedUser: targetUser }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get group balances
// @route   GET /api/groups/:id/balances
// @access  Private (member only)
const getGroupBalances = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not a member of this group'
      });
    }

    const balanceData = await calculateGroupBalances(group._id);

    res.status(200).json({
      success: true,
      data: balanceData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroup,
  getUserGroups,
  getGroupById,
  addMemberByEmail,
  getGroupBalances
};
