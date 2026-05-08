# ⚡ TaskFlow — Team Task Manager

A full-stack team task management web application with role-based access control, kanban boards, and real-time collaboration features.

## 🚀 Features

- **Authentication** — JWT-based signup/login with secure password hashing
- **Role-Based Access** — Admin and Member roles per project
- **Project Management** — Create, update, delete projects; invite members by email
- **Kanban Board** — Drag-free visual board with To Do / In Progress / Review / Done columns
- **Task Management** — Full CRUD, priority levels, due dates, tags, assignees
- **Dashboard** — Status overview, task stats, overdue tracking
- **My Tasks** — Personal task view with filtering and sorting
- **REST API** — Fully documented RESTful backend

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Validation | express-validator |
| Styling | Custom CSS (no UI framework) |

## 📁 Project Structure

```
team-task-manager/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Task.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   └── users.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── SignupPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── ProjectsPage.jsx
    │   │   ├── ProjectDetailPage.jsx
    │   │   └── MyTasksPage.jsx
    │   ├── components/
    │   │   └── Layout.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
# Runs on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## 🌐 Deploy on Railway

### Backend Service
1. Connect GitHub repo → New Service → Backend folder
2. Set environment variables:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-secret-key
   CLIENT_URL=https://your-frontend.up.railway.app
   PORT=5000
   ```
3. Start command: `node server.js`

### Frontend Service
1. New Service → Frontend folder
2. Set environment variable:
   ```
   VITE_API_URL=https://your-backend.up.railway.app/api
   ```
3. Build command: `npm run build`
4. Start command: `npx serve dist`

## 🔑 API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Projects
| Method | Route | Description | Role |
|--------|-------|-------------|------|
| GET | `/api/projects` | List user's projects | Member |
| POST | `/api/projects` | Create project | Any |
| GET | `/api/projects/:id` | Get project | Member |
| PUT | `/api/projects/:id` | Update project | Admin |
| DELETE | `/api/projects/:id` | Delete project | Admin |
| POST | `/api/projects/:id/members` | Add member | Admin |
| DELETE | `/api/projects/:id/members/:userId` | Remove member | Admin |

### Tasks
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tasks?projectId=xxx` | Get project tasks |
| GET | `/api/tasks/dashboard` | Get dashboard data |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/comments` | Add comment |

## 📸 Screenshots

> Dashboard → Projects → Kanban Board → My Tasks

## 🎥 Demo

[Link to 2-5 min demo video]

## 👥 Author

Built as a full-stack assignment demonstrating:
- RESTful API design with proper validation
- JWT authentication & role-based authorization
- MongoDB schema design with relationships
- React SPA with context-based state management
- Production-ready deployment configuration
