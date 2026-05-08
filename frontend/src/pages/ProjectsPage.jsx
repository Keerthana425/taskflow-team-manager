import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, createProject } from '../api';
import { format } from 'date-fns';

const COLORS = ['#7c6af7', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6'];

function ProjectCard({ project }) {
  const total = Object.values(project.taskCounts || {}).reduce((a, b) => a + b, 0);
  const done = project.taskCounts?.done || 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Link to={`/projects/${project._id}`} className="project-card">
      <div className="project-color-bar" style={{ background: project.color || '#7c6af7' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span className={`badge badge-${project.status === 'active' ? 'in-progress' : project.status === 'completed' ? 'done' : 'todo'}`}>
          {project.status}
        </span>
        {project.dueDate && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Due {format(new Date(project.dueDate), 'MMM d, yyyy')}
          </span>
        )}
      </div>
      <div className="project-name">{project.name}</div>
      <div className="project-desc">{project.description || 'No description'}</div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Progress</span>
          <span style={{ fontSize: 11, fontWeight: 700 }}>{progress}%</span>
        </div>
        <div style={{ height: 4, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: project.color || '#7c6af7',
            borderRadius: 99,
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="project-stats">
          <span className="project-stat"><strong>{total}</strong> tasks</span>
          <span className="project-stat"><strong>{project.members?.length}</strong> members</span>
        </div>
        <div className="project-members">
          {project.members?.slice(0, 4).map((m, i) => (
            <div key={m.user?._id || i} className="member-avatar" title={m.user?.name}>
              {m.user?.name?.charAt(0).toUpperCase() || '?'}
            </div>
          ))}
          {project.members?.length > 4 && (
            <div className="member-avatar" style={{ background: 'var(--bg-elevated)' }}>
              +{project.members.length - 4}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0], dueDate: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await createProject({ ...form, dueDate: form.dueDate || undefined });
      onCreated(res.data.project);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Project</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label className="label">Project Name *</label>
              <input className="input" placeholder="My Awesome Project" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="label">Description</label>
              <textarea className="textarea" placeholder="What's this project about?" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                    style={{
                      width: 32, height: 32, borderRadius: 8, background: c, border: 'none',
                      cursor: 'pointer', outline: form.color === c ? `3px solid white` : 'none',
                      outlineOffset: 2, transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.15s'
                    }} />
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="label">Due Date</label>
              <input className="input" type="date" value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getProjects()
      .then(res => setProjects(res.data.projects))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (project) => {
    setProjects(prev => [project, ...prev]);
    setShowModal(false);
  };

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Project
        </button>
      </div>

      <div className="page-body">
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗂️</div>
            <div className="empty-state-title">No projects yet</div>
            <div className="empty-state-text">Create your first project to get started</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
              Create Project
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(p => <ProjectCard key={p._id} project={p} />)}
          </div>
        )}
      </div>

      {showModal && <CreateProjectModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </>
  );
}
