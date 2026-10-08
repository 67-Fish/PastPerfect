# PastPerfect - School Past Papers Archive

A SaveMyExams-like platform for schools to manage and distribute past exam papers to their students.

## Features

- **Multi-school support** - Each school gets isolated data with custom branding
- **Role-based access** - Admin, SchoolAdmin, Teacher, Student roles
- **PDF upload & management** - Drag-and-drop upload with metadata
- **Advanced filtering** - Search by subject, year, exam series, grade, paper type
- **JWT Authentication** - Access tokens + HttpOnly refresh cookies
- **Real-time updates** - WebSocket notifications
- **Background jobs** - Token cleanup, session maintenance
- **SaveMyExams-inspired design** - Clean, modern UI with custom color scheme

## Tech Stack

- **Backend**: Node.js (ES Modules), Express 5, MySQL 8
- **Frontend**: EJS (Server-side rendering), Alpine.js (minimal interactivity)
- **Database**: MySQL 8 with shared schema multi-tenancy
- **Auth**: JWT + HttpOnly cookies with refresh token rotation
- **Real-time**: WebSocket (ws library)
- **Jobs**: node-cron + in-memory queue

## Project Structure

```
src/
├── config/           # Environment config, constants
├── modules/          # Domain modules
│   ├── auth/         # Authentication (register, login, JWT)
│   ├── schools/      # School, subject, exam series management
│   ├── users/        # User management within schools
│   ├── papers/       # Core paper CRUD, upload, download
│   ├── payments/     # Placeholder for future payment integration
│   └── study/        # Placeholder for study features
├── shared/           # Cross-cutting concerns
│   ├── middleware/   # Auth, validation, error handling, rate limiting
│   ├── utils/        # Logger, helpers
│   ├── database/     # MySQL pool, base repository, migrations
│   ├── websocket/    # WebSocket server
│   └── jobs/         # Background job scheduler
├── views/            # EJS templates
│   ├── layouts/      # Main layout
│   ├── partials/     # Reusable components (navbar, footer, etc.)
│   ├── auth/         # Login, register pages
│   ├── dashboard/    # User dashboard
│   ├── papers/       # Paper list, upload, detail
│   └── study/        # Study placeholder pages
├── public/           # Static assets
│   ├── css/          # Design system (tokens, components, utilities)
│   └── js/           # Client-side JS (API client, app.js)
├── app.js            # Express application entry point
└── routes/           # View routes (SSR)
```

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL 8.0+ (external or via Docker)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and secrets
   ```

4. Run migrations (creates tables):
   ```bash
   npm run db:migrate
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

6. Visit `http://localhost:3000`

### Docker Deployment

```bash
docker-compose up -d
```

## Database Schema

Key tables (all scoped by `school_id`):
- `schools` - School information and branding
- `users` - Users belonging to schools
- `roles` - Role definitions (admin, schoolAdmin, teacher, student)
- `user_roles` - Many-to-many user-role assignments
- `subjects` - Academic subjects per school
- `exam_series` - Exam sessions (e.g., "June 2024")
- `papers` - Past paper metadata
- `paper_files` - PDF BLOB storage
- `refresh_tokens` - JWT refresh token store
- `payments` - Placeholder for subscriptions
- `study_sessions` - Placeholder for study tracking

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new school/user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Papers
- `GET /api/papers` - List papers (with filters)
- `POST /api/papers` - Upload paper (multipart/form-data)
- `GET /api/papers/:id` - Get paper details
- `GET /api/papers/:id/view` - View PDF inline
- `GET /api/papers/:id/download` - Download PDF
- `PUT /api/papers/:id` - Update paper
- `DELETE /api/papers/:id` - Delete paper

### Schools (Admin)
- `GET /api/schools` - List schools
- `POST /api/schools` - Create school
- `GET /api/schools/:id` - Get school
- `PUT /api/schools/:id` - Update school
- `DELETE /api/schools/:id` - Delete school

### Users (SchoolAdmin, Admin)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/:id/roles` - Assign role
- `DELETE /api/users/:id/roles` - Remove role

## Design System

Colors:
- Deep Navy `#172A46` - Main branding, headings
- Sky Blue `#6FA8DC` - Buttons, highlights
- Soft Cream `#F7F4EC` - Background
- White `#FFFFFF` - Cards, sections
- Dark Grey `#343A40` - Body text

Fonts:
- Titles: Poppins Bold
- Subtitles: Poppins Medium
- Body: Inter Regular
- Important: Poppins SemiBold

## Security

- Helmet.js for security headers
- Rate limiting on auth endpoints
- Parameterized queries (SQL injection prevention)
- File upload validation (type, size, magic bytes)
- HttpOnly, Secure, SameSite cookies
- JWT token rotation

## Background Jobs

- `cleanupExpiredTokens` - Daily at 3 AM
- `cleanupOldSessions` - Weekly on Sunday at 4 AM
- `sendPendingNotifications` - Every 5 minutes

## License

MIT