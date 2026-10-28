const Group = require('../models/Group');

/**
 * Middleware ensuring the authenticated user is an authorized member of the target group.
 */
const requireGroupMembership = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.params.id || req.body.groupId;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required to verify membership'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = group.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not a member of this group'
      });
    }

    // Attach group to request for convenience in downstream handlers
    req.group = group;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requireGroupMembership };
