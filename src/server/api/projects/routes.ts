const { Router } = require('express');
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} = require('./controller');

const router = Router();

router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
