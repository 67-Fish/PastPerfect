import { userRepository } from './repository.js';
import { AppError, NotFoundError } from '../../shared/middleware/errorHandler.js';
import { ROLES } from '../../config/constants.js';

export class UserService {
  async getUsers(user, filters, options) {
    // Admin can see all users, schoolAdmin sees their school, others see nothing
    if (!user.roles.includes('admin') && !user.roles.includes('schoolAdmin')) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }
    
    const schoolId = user.roles.includes('admin') ? (filters.schoolId || null) : user.schoolId;
    return userRepository.findWithRoles(filters, options, schoolId);
  }

  async getUserById(userId, user) {
    const targetUser = await userRepository.getUserWithRoles(userId, user.roles.includes('admin') ? null : user.schoolId);
    if (!targetUser) throw new NotFoundError('User');
    return targetUser;
  }

  async createUser(user, userData) {
    if (!user.roles.includes('admin') && !user.roles.includes('schoolAdmin')) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }
    
    const schoolId = user.roles.includes('admin') ? userData.schoolId : user.schoolId;
    const role = userData.role || ROLES.STUDENT;
    
    // Validate role hierarchy
    if (user.roles.includes('schoolAdmin') && (role === ROLES.ADMIN || role === ROLES.SCHOOL_ADMIN)) {
      throw new AppError('Cannot assign admin or schoolAdmin role', 403, 'FORBIDDEN');
    }
    
    return userRepository.createWithRole(
      { email: userData.email, passwordHash: userData.passwordHash, firstName: userData.firstName, lastName: userData.lastName, phone: userData.phone },
      role,
      schoolId,
      user.id
    );
  }

  async updateUser(user, userId, userData) {
    const targetUser = await this.getUserById(userId, user);
    
    const data = {};
    if (userData.firstName !== undefined) data.first_name = userData.firstName;
    if (userData.lastName !== undefined) data.last_name = userData.lastName;
    if (userData.phone !== undefined) data.phone = userData.phone;
    if (userData.isActive !== undefined) data.is_active = userData.isActive;
    
    if (Object.keys(data).length > 0) {
      await userRepository.update(userId, data, user.roles.includes('admin') ? null : user.schoolId);
    }
    
    return this.getUserById(userId, user);
  }

  async deleteUser(user, userId) {
    if (!user.roles.includes('admin') && !user.roles.includes('schoolAdmin')) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }
    
    // Prevent self-deletion
    if (userId === user.id) {
      throw new AppError('Cannot delete your own account', 400, 'SELF_DELETE');
    }
    
    const targetUser = await this.getUserById(userId, user);
    
    // SchoolAdmin can't delete other schoolAdmins
    if (user.roles.includes('schoolAdmin') && targetUser.roles.includes(ROLES.SCHOOL_ADMIN)) {
      throw new AppError('Cannot delete another school admin', 403, 'FORBIDDEN');
    }
    
    await userRepository.softDelete(userId, user.roles.includes('admin') ? null : user.schoolId);
    return { success: true };
  }

  async assignRole(user, userId, roleName) {
    if (!user.roles.includes('admin') && !user.roles.includes('schoolAdmin')) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }
    
    // Validate role assignment permissions
    if (user.roles.includes('schoolAdmin')) {
      if ([ROLES.ADMIN, ROLES.SCHOOL_ADMIN].includes(roleName)) {
        throw new AppError('Cannot assign this role', 403, 'FORBIDDEN');
      }
    }
    
    const targetUser = await this.getUserById(userId, user);
    await userRepository.assignRole(userId, roleName, user.id);
    
    return this.getUserById(userId, user);
  }

  async removeRole(user, userId, roleName) {
    if (!user.roles.includes('admin') && !user.roles.includes('schoolAdmin')) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }
    
    const targetUser = await this.getUserById(userId, user);
    
    // Prevent removing last schoolAdmin
    if (roleName === ROLES.SCHOOL_ADMIN) {
      const [countResult] = await query(
        `SELECT COUNT(*) as count FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = ? AND ur.user_id != ?`,
        [ROLES.SCHOOL_ADMIN, userId]
      );
      if (countResult[0].count === 0) {
        throw new AppError('Cannot remove the last school admin', 400, 'LAST_ADMIN');
      }
    }
    
    await userRepository.removeRole(userId, roleName);
    return this.getUserById(userId, user);
  }

  async getRoles() {
    return userRepository.getRoles();
  }
}

export const userService = new UserService();