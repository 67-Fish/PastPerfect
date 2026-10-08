import { getPool, query, execute } from './pool.js';
import { logger } from '../utils/logger.js';

const MIGRATIONS_TABLE = 'migrations';

const migrations = [
  {
    name: '001_create_migrations_table',
    up: `
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '002_create_schools',
    up: `
      CREATE TABLE IF NOT EXISTS schools (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        domain VARCHAR(255) UNIQUE,
        logo_url VARCHAR(500),
        primary_color VARCHAR(7) DEFAULT '#172A46',
        secondary_color VARCHAR(7) DEFAULT '#6FA8DC',
        is_active BOOLEAN DEFAULT TRUE,
        settings JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_slug (slug),
        INDEX idx_domain (domain)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '003_create_roles',
    up: `
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        hierarchy_level INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '004_create_users',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        avatar_url VARCHAR(500),
        phone VARCHAR(30),
        is_active BOOLEAN DEFAULT TRUE,
        email_verified_at TIMESTAMP NULL,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        UNIQUE KEY uk_email_school (email, school_id),
        INDEX idx_school_id (school_id),
        INDEX idx_email (email),
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '005_create_user_roles',
    up: `
      CREATE TABLE IF NOT EXISTS user_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        assigned_by INT,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_role (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '006_create_subjects',
    up: `
      CREATE TABLE IF NOT EXISTS subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#6FA8DC',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_code_school (code, school_id),
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '007_create_exam_series',
    up: `
      CREATE TABLE IF NOT EXISTS exam_series (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        year YEAR NOT NULL,
        term VARCHAR(50),
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_name_year_school (name, year, school_id),
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '008_create_papers',
    up: `
      CREATE TABLE IF NOT EXISTS papers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_id INT NOT NULL,
        subject_id INT NOT NULL,
        exam_series_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        grade_level VARCHAR(50),
        paper_type ENUM('exam', 'mark_scheme', 'examiner_report', 'syllabus', 'other') DEFAULT 'exam',
        duration_minutes INT,
        total_marks INT,
        status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
        published_at TIMESTAMP NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_school_subject (school_id, subject_id),
        INDEX idx_school_series (school_id, exam_series_id),
        INDEX idx_status (status),
        INDEX idx_grade (grade_level),
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
        FOREIGN KEY (exam_series_id) REFERENCES exam_series(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '009_create_paper_files',
    up: `
      CREATE TABLE IF NOT EXISTS paper_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paper_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_data LONGBLOB NOT NULL,
        page_count INT,
        thumbnail_data LONGBLOB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '010_create_payments',
    up: `
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_id INT NOT NULL,
        user_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'GBP',
        type ENUM('subscription', 'one_time') NOT NULL,
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        provider VARCHAR(50),
        provider_payment_id VARCHAR(255),
        provider_data JSON,
        description TEXT,
        metadata JSON,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_school_user (school_id, user_id),
        INDEX idx_status (status),
        INDEX idx_provider_payment (provider, provider_payment_id),
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '011_create_study_sessions',
    up: `
      CREATE TABLE IF NOT EXISTS study_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_id INT NOT NULL,
        user_id INT NOT NULL,
        paper_id INT,
        subject_id INT,
        session_type ENUM('practice', 'timed', 'review') DEFAULT 'practice',
        status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        time_spent_seconds INT DEFAULT 0,
        score DECIMAL(5, 2),
        max_score DECIMAL(5, 2),
        answers JSON,
        metadata JSON,
        INDEX idx_user_session (user_id, status),
        INDEX idx_paper_session (paper_id, user_id),
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE SET NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '012_create_refresh_tokens',
    up: `
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP NULL,
        replaced_by_token_hash VARCHAR(255),
        user_agent TEXT,
        ip_address VARCHAR(45),
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '013_seed_roles',
    up: `
      INSERT IGNORE INTO roles (name, display_name, description, hierarchy_level) VALUES
        ('admin', 'Super Admin', 'Platform administrator with full access', 4),
        ('schoolAdmin', 'School Admin', 'School administrator managing their school', 3),
        ('teacher', 'Teacher', 'Teacher who can upload and manage papers', 2),
        ('student', 'Student', 'Student who can view and download papers', 1);
    `,
  },
];

export async function runMigrations() {
  const pool = getPool();

  const executed = await query(
    `SELECT name FROM ${MIGRATIONS_TABLE}`
  );
  const executedNames = new Set(executed.map(m => m.name));

  for (const migration of migrations) {
    if (!executedNames.has(migration.name)) {
      logger.info({ migration: migration.name }, 'Running migration');
      try {
        await pool.query(migration.up);
        await execute(
          `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`,
          [migration.name]
        );
        logger.info({ migration: migration.name }, 'Migration completed');
      } catch (error) {
        logger.error({ err: error, migration: migration.name }, 'Migration failed');
        throw error;
      }
    } else {
      logger.info({ migration: migration.name }, 'Migration already executed, skipping');
    }
  }

  logger.info('All migrations completed');
}

export async function rollbackMigration(name) {
  const migration = migrations.find(m => m.name === name);
  if (!migration) {
    throw new Error(`Migration ${name} not found`);
  }

  await execute(`DELETE FROM ${MIGRATIONS_TABLE} WHERE name = ?`, [name]);
  logger.info({ migration: name }, 'Migration rolled back (manual cleanup required)');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runMigrations();
  process.exit(0);
}