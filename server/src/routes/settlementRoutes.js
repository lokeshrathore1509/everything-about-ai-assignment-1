const express = require('express');
const router = express.Router();
const {
  getSettlementPlan,
  recordSettlement,
  getGroupSettlements,
  deleteSettlement
} = require('../controllers/settlementController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All settlement routes are protected

router.get('/plan/:groupId', getSettlementPlan);
router.post('/', recordSettlement);
router.get('/group/:groupId', getGroupSettlements);
router.delete('/:id', deleteSettlement);

module.exports = router;
