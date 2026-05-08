const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Helper: check project membership
const getProjectMembership = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { project: null, role: null };
  const member = project.members.find(m => m.user.toString() === userId.toString());
  return { project, role: member ? member.role : null };
};

// GET /api/tasks?projectId=xxx - Get tasks for a project
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId, status, priority, assignee } = req.query;

    if (!projectId) {
      // Get all tasks assigned to user across projects
      const tasks = await Task.find({ assignee: req.user._id })
        .populate('project', 'name color')
        .populate('assignee', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .sort({ dueDate: 1, createdAt: -1 });
      return res.json({ tasks });
    }

    const { project, role } = await getProjectMembership(projectId, req.user._id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!role) return res.status(403).json({ message: 'Access denied' });

    const filter = { project: projectId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee;

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/tasks/dashboard - Dashboard summary
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userProjects = await Project.find({ 'members.user': req.user._id });
    const projectIds = userProjects.map(p => p._id);

    const [totalTasks, myTasks, overdueTasks, recentTasks] = await Promise.all([
      Task.countDocuments({ project: { $in: projectIds } }),
      Task.countDocuments({ assignee: req.user._id, status: { $ne: 'done' } }),
      Task.countDocuments({
        project: { $in: projectIds },
        dueDate: { $lt: new Date() },
        status: { $ne: 'done' }
      }),
      Task.find({ project: { $in: projectIds } })
        .populate('project', 'name color')
        .populate('assignee', 'name email avatar')
        .sort({ updatedAt: -1 })
        .limit(10)
    ]);

    const statusCounts = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusMap = { todo: 0, 'in-progress': 0, review: 0, done: 0 };
    statusCounts.forEach(({ _id, count }) => { statusMap[_id] = count; });

    res.json({
      stats: { totalTasks, myTasks, overdueTasks, totalProjects: userProjects.length, statusMap },
      recentTasks
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/tasks - Create task
router.post('/', authenticate, [
  body('title').trim().isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
  body('projectId').notEmpty().withMessage('Project ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { title, description, status, priority, projectId, assignee, dueDate, tags } = req.body;

    const { project, role } = await getProjectMembership(projectId, req.user._id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!role) return res.status(403).json({ message: 'Access denied' });

    const task = await Task.create({
      title, description, status, priority, dueDate, tags,
      project: projectId,
      assignee: assignee || null,
      createdBy: req.user._id
    });

    await task.populate('assignee', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    res.status(201).json({ task });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const { project, role } = await getProjectMembership(task.project, req.user._id);
    if (!role) return res.status(403).json({ message: 'Access denied' });

    const { title, description, status, priority, assignee, dueDate, tags } = req.body;
    const updates = {};
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assignee !== undefined) updates.assignee = assignee || null;
    if (dueDate !== undefined) updates.dueDate = dueDate || null;
    if (tags) updates.tags = tags;

    const updated = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    res.json({ task: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/tasks/:id - Delete task (Admin or creator)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const { role } = await getProjectMembership(task.project, req.user._id);
    if (!role) return res.status(403).json({ message: 'Access denied' });

    if (role !== 'Admin' && task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admins or task creator can delete tasks' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/tasks/:id/comments - Add comment
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text required' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const { role } = await getProjectMembership(task.project, req.user._id);
    if (!role) return res.status(403).json({ message: 'Access denied' });

    task.comments.push({ author: req.user._id, text: text.trim() });
    await task.save();
    await task.populate('comments.author', 'name email avatar');

    res.json({ task });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
