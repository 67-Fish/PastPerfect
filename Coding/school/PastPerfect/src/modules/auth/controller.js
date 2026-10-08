import { authService } from './service.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie, generateAccessToken } from '../../shared/middleware/auth.js';
import { asyncHandler, ValidationError } from '../../shared/middleware/errorHandler.js';

export class AuthController {
  register = asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, schoolName, schoolSlug, phone } = req.body;

    // Validation
    const errors = [];
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Valid email is required' });
    }
    if (!password || password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    }
    if (!firstName || firstName.trim().length < 1) {
      errors.push({ field: 'firstName', message: 'First name is required' });
    }
    if (!lastName || lastName.trim().length < 1) {
      errors.push({ field: 'lastName', message: 'Last name is required' });
    }
    if (!schoolName || schoolName.trim().length < 1) {
      errors.push({ field: 'schoolName', message: 'School name is required' });
    }
    if (!schoolSlug || !/^[a-z0-9-]+$/.test(schoolSlug)) {
      errors.push({ field: 'schoolSlug', message: 'School URL must contain only lowercase letters, numbers, and hyphens' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }

    const result = await authService.register({
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      schoolName: schoolName.trim(),
      schoolSlug: schoolSlug.toLowerCase().trim(),
      phone: phone?.trim() || null,
    });

    // Auto-login after registration
    const loginResult = await authService.login(
      email.toLowerCase().trim(),
      password,
      result.schoolId,
      req.get('user-agent') || '',
      req.ip
    );

    setRefreshTokenCookie(res, loginResult.refreshToken);

    res.status(201).json({
      message: result.isNewSchool ? 'School registered successfully' : 'Account created successfully',
      user: loginResult.user,
      accessToken: loginResult.accessToken,
      isNewSchool: result.isNewSchool,
    });
  });

  login = asyncHandler(async (req, res) => {
    const { email, password, schoolSlug } = req.body;

    if (!email || !password || !schoolSlug) {
      throw new ValidationError('Email, password, and school are required', [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is required' },
        { field: 'schoolSlug', message: 'School is required' },
      ]);
    }

    const { queryOne } = await import('../../shared/database/pool.js');
    const school = await queryOne(
      `SELECT id FROM schools WHERE slug = ? AND is_active = true`,
      [schoolSlug.toLowerCase().trim()]
    );

    if (!school) {
      throw new ValidationError('School not found', [
        { field: 'schoolSlug', message: 'School not found' }
      ]);
    }

    const result = await authService.login(
      email.toLowerCase().trim(),
      password,
      school.id,
      req.get('user-agent') || '',
      req.ip
    );

    setRefreshTokenCookie(res, result.refreshToken);

    res.json({
      message: 'Login successful',
      user: result.user,
      accessToken: result.accessToken,
    });
  });

  logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.pp_refresh_token;
    await authService.logout(refreshToken);
    clearRefreshTokenCookie(res);
    res.json({ message: 'Logged out successfully' });
  });

  refresh = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.pp_refresh_token;
    
    if (!refreshToken) {
      throw new ValidationError('Refresh token required', [
        { field: 'refreshToken', message: 'Refresh token is required' }
      ]);
    }

    const result = await authService.refresh(
      refreshToken,
      req.get('user-agent') || '',
      req.ip
    );

    setRefreshTokenCookie(res, result.refreshToken);

    res.json({
      message: 'Token refreshed',
      user: result.user,
      accessToken: result.accessToken,
    });
  });

  me = asyncHandler(async (req, res) => {
    // req.user is set by authenticate middleware
    res.json({ user: req.user });
  });

  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current and new password are required', [
        { field: 'currentPassword', message: 'Current password is required' },
        { field: 'newPassword', message: 'New password is required' },
      ]);
    }

    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters', [
        { field: 'newPassword', message: 'Password too short' }
      ]);
    }

    await authService.changePassword(req.user.id, currentPassword, newPassword);
    clearRefreshTokenCookie(res);

    res.json({ message: 'Password changed successfully. Please log in again.' });
  });

  requestPasswordReset = asyncHandler(async (req, res) => {
    const { email, schoolSlug } = req.body;

    if (!email || !schoolSlug) {
      throw new ValidationError('Email and school are required', [
        { field: 'email', message: 'Email is required' },
        { field: 'schoolSlug', message: 'School is required' },
      ]);
    }

    const { queryOne } = await import('../../shared/database/pool.js');
    const school = await queryOne(
      `SELECT id FROM schools WHERE slug = ? AND is_active = true`,
      [schoolSlug.toLowerCase().trim()]
    );

    if (!school) {
      // Don't reveal if school exists
      return res.json({ message: 'If the email exists, a reset link will be sent' });
    }

    await authService.requestPasswordReset(email.toLowerCase().trim(), school.id);

    res.json({ message: 'If the email exists, a reset link will be sent' });
  });

  resetPassword = asyncHandler(async (req, res) => {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      throw new ValidationError('Reset token and new password are required', [
        { field: 'resetToken', message: 'Reset token is required' },
        { field: 'newPassword', message: 'New password is required' },
      ]);
    }

    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters', [
        { field: 'newPassword', message: 'Password too short' }
      ]);
    }

    await authService.resetPassword(resetToken, newPassword);

    res.json({ message: 'Password reset successfully. Please log in.' });
  });
}

export const authController = new AuthController();