import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getTasks, createTask, updateTask, deleteTask, addMember, removeMember, deleteProject } from '../api';
import { useAuth } from '../context/AuthContext';
import { format, isAfter } from 'date-fns';

function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: '#6b6b8a' },
  { key: 'in-progress', label: 'In Progress', color: '#3b82f6' },
  { key: 'review', label: 'Review', color: '#f59e0b' },
  { key: 'done', label: 'Done', color: '#22c55e' },
];

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

function TaskModal({ task, project, onClose, onSaved, onDeleted, currentUser }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee: task?.assignee?._id || '',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
    tags: task?.tags?.join(', ') || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [taskData, setTaskData] = useState(task);

  const isAdmin = project.members.find(m => m.user._id === currentUser._id)?.role === 'Admin';
  const canDelete = isAdmin || task?.createdBy?._id === currentUser._id;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        assignee: form.assignee || null,
        dueDate: form.dueDate || null,
      };

      let res;
      if (task) {
        res = await updateTask(task._id, payload);
        onSaved(res.data.task, 'update');
      } else {
        res = await createTask({ ...payload, projectId: project._id });
        onSaved(res.data.task, 'create');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTask(task._id);
      onDeleted(task._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2 className="modal-title">{task ? 'Edit Task' : 'New Task'}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {task && canDelete && (
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body">
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="Task title" />
            </div>
            <div className="form-group">
              <label className="label">Description</label>
              <textarea className="textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Task details..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="label">Status</label>
                <select className="select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Priority</label>
                <select className="select" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="label">Assignee</label>
                <select className="select" value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})}>
                  <option value="">Unassigned</option>
                  {project.members.map(m => (
                    <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Due Date</label>
                <input className="input" type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Tags (comma separated)</label>
              <input className="input" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="frontend, urgent, bug" />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({ project, onClose, onAdded }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await addMember(project._id, { email, role });
      onAdded(res.data.project);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add Member</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label className="label">User Email *</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" required />
            </div>
            <div className="form-group">
              <label className="label">Role</label>
              <select className="select" value={role} onChange={e => setRole(e.target.value)}>
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskCard({ task, onClick }) {
  const overdue = task.dueDate && isAfter(new Date(), new Date(task.dueDate)) && task.status !== 'done';
  const priorityColors = { low: '#6b6b8a', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };

  return (
    <div className="task-card" onClick={() => onClick(task)}>
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: priorityColors[task.priority] || '#6b6b8a', borderRadius: '8px 0 0 8px' }} />
      <div style={{ paddingLeft: 8 }}>
        {task.tags?.length > 0 && (
          <div className="task-tags">
            {task.tags.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        )}
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <div>
            {overdue && <span className="overdue-indicator">⚠️ Overdue</span>}
            {task.dueDate && !overdue && (
              <span className="due-date">📅 {format(new Date(task.dueDate), 'MMM d')}</span>
            )}
          </div>
          {task.assignee && (
            <div className="avatar" style={{ width: 24, height: 24, fontSize: 9 }} title={task.assignee.name}>
              {getInitials(task.assignee.name)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState('todo');

  const myRole = project?.members?.find(m => m.user._id === user?._id)?.role;
  const isAdmin = myRole === 'Admin';

  useEffect(() => {
    Promise.all([getProject(id), getTasks({ projectId: id })])
      .then(([pRes, tRes]) => {
        setProject(pRes.data.project);
        setTasks(tRes.data.tasks);
      })
      .catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleTaskSaved = (task, action) => {
    if (action === 'create') {
      setTasks(prev => [task, ...prev]);
    } else {
      setTasks(prev => prev.map(t => t._id === task._id ? task : t));
    }
  };

  const handleTaskDeleted = (taskId) => {
    setTasks(prev => prev.filter(t => t._id !== taskId));
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const res = await updateTask(task._id, { status: newStatus });
      setTasks(prev => prev.map(t => t._id === task._id ? res.data.task : t));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      const res = await removeMember(id, userId);
      setProject(res.data.project);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project and all its tasks? This cannot be undone.')) return;
    try {
      await deleteProject(id);
      navigate('/projects');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  if (!project) return null;

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: project.color || '#7c6af7' }} />
            <button onClick={() => navigate('/projects')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
              Projects
            </button>
            <span style={{ color: 'var(--text-dim)' }}>/</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{project.name}</span>
          </div>
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddMember(true)}>+ Member</button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => { setNewTaskStatus('todo'); setShowNewTask(true); }}>
            + Task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 32px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 0 }}>
        {['board', 'members'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              background: 'none', border: 'none', color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '12px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font-body)', textTransform: 'capitalize', transition: 'color 0.15s'
            }}>
            {tab}
          </button>
        ))}
      </div>

      <div className="page-body">
        {activeTab === 'board' && (
          <div className="board">
            {COLUMNS.map(col => (
              <div key={col.key} className="board-col">
                <div className="board-col-header">
                  <div className="col-title">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                    {col.label}
                    <span className="col-count">{tasksByStatus[col.key]?.length || 0}</span>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ fontSize: 16, padding: 4 }}
                    onClick={() => { setNewTaskStatus(col.key); setShowNewTask(true); }}
                    title="Add task">+</button>
                </div>
                <div className="board-col-body">
                  {tasksByStatus[col.key]?.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: 13 }}>
                      No tasks
                    </div>
                  )}
                  {tasksByStatus[col.key]?.map(task => (
                    <TaskCard key={task._id} task={task} onClick={setSelectedTask} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'members' && (
          <div style={{ maxWidth: 600 }}>
            {project.members.map(member => (
              <div key={member.user._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10, padding: '14px 18px' }}>
                <div className="avatar avatar-lg">{getInitials(member.user.name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{member.user.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{member.user.email}</div>
                </div>
                <span className={`badge badge-${member.role.toLowerCase()}`}>{member.role}</span>
                {isAdmin && member.user._id !== project.owner._id && member.user._id !== user?._id && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(member.user._id)}>Remove</button>
                )}
              </div>
            ))}
            {isAdmin && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-danger" onClick={handleDeleteProject}>
                  🗑️ Delete Project
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {(selectedTask || showNewTask) && (
        <TaskModal
          task={selectedTask}
          project={project}
          currentUser={user}
          onClose={() => { setSelectedTask(null); setShowNewTask(false); }}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeleted}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          project={project}
          onClose={() => setShowAddMember(false)}
          onAdded={(updated) => { setProject(updated); setShowAddMember(false); }}
        />
      )}
    </>
  );
}
