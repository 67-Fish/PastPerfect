export const ROLES = {
  ADMIN: 'admin',
  SCHOOL_ADMIN: 'schoolAdmin',
  TEACHER: 'teacher',
  STUDENT: 'student',
};

export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 4,
  [ROLES.SCHOOL_ADMIN]: 3,
  [ROLES.TEACHER]: 2,
  [ROLES.STUDENT]: 1,
};

export const PERMISSIONS = {
  MANAGE_SCHOOLS: 'manage:schools',
  MANAGE_USERS: 'manage:users',
  MANAGE_PAPERS: 'manage:papers',
  VIEW_PAPERS: 'view:papers',
  DOWNLOAD_PAPERS: 'download:papers',
  MANAGE_PAYMENTS: 'manage:payments',
  VIEW_ANALYTICS: 'view:analytics',
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.SCHOOL_ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_PAPERS,
    PERMISSIONS.VIEW_PAPERS,
    PERMISSIONS.DOWNLOAD_PAPERS,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  [ROLES.TEACHER]: [
    PERMISSIONS.MANAGE_PAPERS,
    PERMISSIONS.VIEW_PAPERS,
    PERMISSIONS.DOWNLOAD_PAPERS,
  ],
  [ROLES.STUDENT]: [
    PERMISSIONS.VIEW_PAPERS,
    PERMISSIONS.DOWNLOAD_PAPERS,
  ],
};

export const PAPER_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const PAYMENT_TYPE = {
  SUBSCRIPTION: 'subscription',
  ONE_TIME: 'one_time',
};