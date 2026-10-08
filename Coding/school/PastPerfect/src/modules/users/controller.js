import { userService } from './service.js';
import { asyncHandler, ValidationError } from '../../shared/middleware/errorHandler.js';
import { requireRole } from '../../shared/middleware/auth.js';

export class UserController {
  list = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, role, isActive, schoolId } = req.query;
    const filters = {};
    if (search) filters.search = search;
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (schoolId && req.user.roles.includes('admin')) filters.schoolId = parseInt(schoolId, 10);
    
    const options = { page: parseInt(page, 10), limit: Math.min(parseInt(limit, 10), 100) };
    const result = await userService.getUsers(req.user, filters, options);
    res.json({ users: result.data, pagination: result });
  });

  getById = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const user = await userService.getUserById(id, req.user);
    res.json({ user });
  });

  create = asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, phone, role, schoolId } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      throw new ValidationError('Email, password, firstName, and lastName are required', [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is required' },
        { field: 'firstName', message: 'First name is required' },
        { field: 'lastName', message: 'Last name is required' },
      ]);
    }
    
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters', [
        { field: 'password', message: 'Password too short' },
      ]);
    }
    
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 12);
    
    const userId = await userService.createUser(req.user, { email, passwordHash, firstName, lastName, phone, role, schoolId });
    res.status(201).json({ id: userId, message: 'User created successfully' });
  });

  update = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { firstName, lastName, phone, isActive } = req.body;
    
    const user = await userService.updateUser(req.user, id, { firstName, lastName, phone, isActive });
    res.json({ user, message: 'User updated successfully' });
  });

  delete = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await userService.deleteUser(req.user, id);
    res.json({ message: 'User deleted successfully' });
  });

  assignRole = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { role } = req.body;
    
    if (!role) {
      throw new ValidationError('Role is required', [
        { field: 'role', message: 'Role is required' },
      ]);
    }
    
    const user = await userService.assignRole(req.user, id, role);
    res.json({ user, message: 'Role assigned successfully' });
  });

  removeRole = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { role } = req.body;
    
    if (!role) {
      throw new ValidationError('Role is required', [
        { field: 'role', message: 'Role is required' },
      ]);
    }
    
    const user = await userService.removeRole(req.user, id, role);
    res.json({ user, message: 'Role removed successfully' });
  });

  getRoles = asyncHandler(async (req, res) => {
    const roles = await userService.getRoles();
    res.json({ roles });
  });
}

export const userController = new UserController();