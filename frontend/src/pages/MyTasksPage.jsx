import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTasks, updateTask } from '../api';
import { format, isAfter } from 'date-fns';

const STATUS_OPTIONS = ['all', 'todo', 'in-progress', 'review', 'done'];
const STATUS_LABELS = { all: 'All', todo: 'To Do', 'in-progress': 'In Progress', review: 'Review', done: 'Done' };
const PRIORITY_MAP = { low: 0, medium: 1, high: 2, urgent: 3 };

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('dueDate');

  useEffect(() => {
    getTasks()
      .then(res => setTasks(res.data.tasks))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await updateTask(taskId, { status: newStatus });
      setTasks(prev => prev.map(t => t._id === taskId ? res.data.task : t));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = tasks
    .filter(t => filter === 'all' || t.status === filter)
    .sort((a, b) => {
      if (sort === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (sort === 'priority') return PRIORITY_MAP[b.priority] - PRIORITY_MAP[a.priority];
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  const statusColors = { todo: '#6b6b8a', 'in-progress': '#3b82f6', review: '#f59e0b', done: '#22c55e' };
  const priorityColors = { low: '#6b6b8a', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you</p>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                style={{
                  background: filter === s ? 'var(--accent)' : 'transparent',
                  color: filter === s ? 'white' : 'var(--text-muted)',
                  border: 'none', borderRadius: 6, padding: '5px 12px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', transition: 'all 0.15s'
                }}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sort by:</span>
            <select className="select" style={{ width: 'auto', padding: '6px 12px' }} value={sort} onChange={e => setSort(e.target.value)}>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-title">
              {filter === 'all' ? 'No tasks assigned to you' : `No ${STATUS_LABELS[filter]} tasks`}
            </div>
            <div className="empty-state-text">Ask a project admin to assign you tasks</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(task => {
              const overdue = task.dueDate && isAfter(new Date(), new Date(task.dueDate)) && task.status !== 'done';
              return (
                <div key={task._id} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Priority dot */}
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: priorityColors[task.priority], flexShrink: 0 }} />

                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{task.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <Link to={`/projects/${task.project?._id}`} style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: task.project?.color || '#7c6af7' }} />
                          {task.project?.name}
                        </Link>
                        {task.dueDate && (
                          <span style={{ fontSize: 12, color: overdue ? 'var(--red)' : 'var(--text-muted)', fontWeight: overdue ? 600 : 400 }}>
                            {overdue ? '⚠️ Overdue · ' : '📅 '}
                            {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </span>
                        )}
                        {task.tags?.map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    </div>

                    {/* Priority badge */}
                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>

                    {/* Status selector */}
                    <select className="select" style={{ width: 'auto', padding: '5px 10px', fontSize: 12, fontWeight: 600 }}
                      value={task.status}
                      onChange={e => handleStatusChange(task._id, e.target.value)}>
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
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
