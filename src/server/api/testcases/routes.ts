const { Router } = require('express');
const {
  createTestCase,
  getTestCases,
  getTestCase,
  updateTestCase,
  deleteTestCase,
  lockTestCase,
  unlockTestCase,
} = require('./controller');

const router = Router();

router.post('/', createTestCase);
router.get('/', getTestCases);
router.get('/:id', getTestCase);
router.put('/:id', updateTestCase);
router.delete('/:id', deleteTestCase);
router.post('/:id/lock', lockTestCase);
router.post('/:id/unlock', unlockTestCase);

module.exports = router;
