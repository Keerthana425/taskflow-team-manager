import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../api';
import { useAuth } from '../context/AuthContext';
import { format, isAfter } from 'date-fns';

function StatusBadge({ status }) {
  const map = { todo: 'badge-todo', 'in-progress': 'badge-in-progress', review: 'badge-review', done: 'badge-done' };
  const labels = { todo: 'To Do', 'in-progress': 'In Progress', review: 'Review', done: 'Done' };
  return <span className={`badge ${map[status] || 'badge-todo'}`}>{labels[status] || status}</span>;
}

function PriorityBadge({ priority }) {
  const map = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', urgent: 'badge-urgent' };
  return <span className={`badge ${map[priority] || 'badge-medium'}`}>{priority}</span>;
}

function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  const stats = data?.stats || {};
  const recentTasks = data?.recentTasks || [];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening across your projects</p>
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalProjects || 0}</div>
            <div className="stat-label">Total Projects</div>
            <div className="stat-icon">🗂️</div>
          </div>
          <div className="stat-card" style={{ '--accent': '#22c55e' }}>
            <div className="stat-number">{stats.totalTasks || 0}</div>
            <div className="stat-label">Total Tasks</div>
            <div className="stat-icon">📋</div>
          </div>
          <div className="stat-card" style={{ '--accent': '#3b82f6' }}>
            <div className="stat-number">{stats.myTasks || 0}</div>
            <div className="stat-label">Assigned to Me</div>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-card" style={{ '--accent': '#ef4444' }}>
            <div className="stat-number" style={{ color: stats.overdueTasks > 0 ? '#ef4444' : 'inherit' }}>
              {stats.overdueTasks || 0}
            </div>
            <div className="stat-label">Overdue Tasks</div>
            <div className="stat-icon">⚠️</div>
          </div>
        </div>

        {/* Status breakdown */}
        {stats.statusMap && (
          <div className="card mb-4" style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Task Status Overview</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { key: 'todo', label: 'To Do', color: '#6b6b8a' },
                { key: 'in-progress', label: 'In Progress', color: '#3b82f6' },
                { key: 'review', label: 'Review', color: '#f59e0b' },
                { key: 'done', label: 'Done', color: '#22c55e' },
              ].map(s => (
                <div key={s.key} style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{stats.statusMap[s.key] || 0}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${stats.totalTasks ? ((stats.statusMap[s.key] || 0) / stats.totalTasks) * 100 : 0}%`,
                      background: s.color,
                      borderRadius: 99,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent tasks */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Recent Activity</h2>
          <Link to="/my-tasks" className="btn btn-ghost btn-sm">View all →</Link>
        </div>

        {recentTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No tasks yet</div>
            <div className="empty-state-text">Create a project and start adding tasks</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentTasks.map(task => {
              const overdue = task.dueDate && isAfter(new Date(), new Date(task.dueDate)) && task.status !== 'done';
              return (
                <div key={task._id} className="card" style={{ padding: '14px 18px' }}>
                  <div className="flex items-center justify-between gap-4">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{task.title}</div>
                      <div className="flex items-center gap-2">
                        <Link to={`/projects/${task.project?._id}`} style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
                          🗂️ {task.project?.name}
                        </Link>
                        {task.dueDate && (
                          <span style={{ fontSize: 11, color: overdue ? 'var(--red)' : 'var(--text-muted)' }}>
                            {overdue ? '⚠️ ' : '📅 '}{format(new Date(task.dueDate), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                      {task.assignee && (
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                          {getInitials(task.assignee.name)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
