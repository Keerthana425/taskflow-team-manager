const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Helper: check if user is project admin
const isProjectAdmin = (project, userId) => {
  const member = project.members.find(m => m.user.toString() === userId.toString());
  return member && member.role === 'Admin';
};

// GET /api/projects - Get all projects for user
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await Project.find({
      'members.user': req.user._id
    }).populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ updatedAt: -1 });

    // Add task counts
    const projectsWithCounts = await Promise.all(projects.map(async (project) => {
      const taskCounts = await Task.aggregate([
        { $match: { project: project._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      const counts = { todo: 0, 'in-progress': 0, review: 0, done: 0 };
      taskCounts.forEach(({ _id, count }) => { counts[_id] = count; });
      return { ...project.toJSON(), taskCounts: counts };
    }));

    res.json({ projects: projectsWithCounts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/projects - Create project
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 2 }).withMessage('Project name must be at least 2 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, description, color, dueDate } = req.body;
    const project = await Project.create({
      name, description, color, dueDate,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'Admin' }]
    });

    await project.populate('owner', 'name email avatar');
    await project.populate('members.user', 'name email avatar');

    res.status(201).json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isMember = project.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/projects/:id - Update project (Admin only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isProjectAdmin(project, req.user._id)) return res.status(403).json({ message: 'Admin access required' });

    const { name, description, status, color, dueDate } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status) updates.status = status;
    if (color) updates.color = color;
    if (dueDate !== undefined) updates.dueDate = dueDate;

    const updated = await Project.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({ project: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/projects/:id - Delete project (Admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isProjectAdmin(project, req.user._id)) return res.status(403).json({ message: 'Admin access required' });

    await Task.deleteMany({ project: req.params.id });
    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/projects/:id/members - Add member (Admin only)
router.post('/:id/members', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isProjectAdmin(project, req.user._id)) return res.status(403).json({ message: 'Admin access required' });

    const { email, role = 'Member' } = req.body;
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ message: 'User not found with that email' });

    const alreadyMember = project.members.some(m => m.user.toString() === userToAdd._id.toString());
    if (alreadyMember) return res.status(400).json({ message: 'User is already a member' });

    project.members.push({ user: userToAdd._id, role });
    await project.save();
    await project.populate('members.user', 'name email avatar');

    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/projects/:id/members/:userId - Remove member (Admin only)
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!isProjectAdmin(project, req.user._id)) return res.status(403).json({ message: 'Admin access required' });
    if (req.params.userId === project.owner.toString()) return res.status(400).json({ message: 'Cannot remove project owner' });

    project.members = project.members.filter(m => m.user.toString() !== req.params.userId);
    await project.save();
    await project.populate('members.user', 'name email avatar');

    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
