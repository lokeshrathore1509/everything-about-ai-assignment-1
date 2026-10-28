const express = require('express');
const router = express.Router();
const {
  createGroup,
  getUserGroups,
  getGroupById,
  addMemberByEmail,
  getGroupBalances
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All group routes are protected

router.post('/', createGroup);
router.get('/', getUserGroups);
router.get('/:id', getGroupById);
router.post('/:id/members', addMemberByEmail);
router.get('/:id/balances', getGroupBalances);

module.exports = router;
