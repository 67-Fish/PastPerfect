import { schoolService } from './service.js';
import { asyncHandler, ValidationError } from '../../shared/middleware/errorHandler.js';
import { requireRole } from '../../shared/middleware/auth.js';

export class SchoolController {
  list = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const filters = search ? { name: search } : {};
    const options = { page: parseInt(page, 10), limit: Math.min(parseInt(limit, 10), 100) };
    const result = await schoolService.getSchools(req.user, filters, options);
    res.json({ schools: result.data, pagination: result });
  });

  getById = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const school = await schoolService.getSchoolById(id, req.user);
    res.json({ school });
  });

  create = asyncHandler(async (req, res) => {
    const { name, slug, domain, primaryColor, secondaryColor } = req.body;
    
    if (!name || !slug) {
      throw new ValidationError('Name and slug are required', [
        { field: 'name', message: 'Name is required' },
        { field: 'slug', message: 'Slug is required' },
      ]);
    }
    
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new ValidationError('Invalid slug format', [
        { field: 'slug', message: 'Slug must contain only lowercase letters, numbers, and hyphens' },
      ]);
    }

    const schoolId = await schoolService.createSchool({ name, slug, domain, primaryColor, secondaryColor });
    res.status(201).json({ id: schoolId, message: 'School created successfully' });
  });

  update = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { name, domain, primaryColor, secondaryColor, isActive, settings } = req.body;
    
    const data = {};
    if (name !== undefined) data.name = name;
    if (domain !== undefined) data.domain = domain;
    if (primaryColor !== undefined) data.primary_color = primaryColor;
    if (secondaryColor !== undefined) data.secondary_color = secondaryColor;
    if (isActive !== undefined) data.is_active = isActive;
    if (settings !== undefined) data.settings = settings;

    await schoolService.updateSchool(id, data, req.user);
    res.json({ message: 'School updated successfully' });
  });

  delete = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await schoolService.deleteSchool(id, req.user);
    res.json({ message: 'School deleted successfully' });
  });

  // Subjects
  listSubjects = asyncHandler(async (req, res) => {
    const schoolId = req.user.roles.includes('admin') ? parseInt(req.query.schoolId, 10) : req.user.schoolId;
    const subjects = await schoolService.getSubjects(schoolId, req.user);
    res.json({ subjects });
  });

  createSubject = asyncHandler(async (req, res) => {
    const schoolId = req.user.roles.includes('admin') ? parseInt(req.body.schoolId, 10) : req.user.schoolId;
    const { name, code, description, color } = req.body;
    
    if (!name || !code) {
      throw new ValidationError('Name and code are required', [
        { field: 'name', message: 'Name is required' },
        { field: 'code', message: 'Code is required' },
      ]);
    }

    const subjectId = await schoolService.createSubject(schoolId, { name, code, description, color }, req.user);
    res.status(201).json({ id: subjectId, message: 'Subject created successfully' });
  });

  updateSubject = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.subjectId, 10);
    const { name, code, description, color, isActive } = req.body;
    
    const data = {};
    if (name !== undefined) data.name = name;
    if (code !== undefined) data.code = code;
    if (description !== undefined) data.description = description;
    if (color !== undefined) data.color = color;
    if (isActive !== undefined) data.is_active = isActive;

    await schoolService.updateSubject(id, data, req.user);
    res.json({ message: 'Subject updated successfully' });
  });

  deleteSubject = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.subjectId, 10);
    await schoolService.deleteSubject(id, req.user);
    res.json({ message: 'Subject deleted successfully' });
  });

  // Exam Series
  listExamSeries = asyncHandler(async (req, res) => {
    const schoolId = req.user.roles.includes('admin') ? parseInt(req.query.schoolId, 10) : req.user.schoolId;
    const series = await schoolService.getExamSeries(schoolId, req.user);
    res.json({ examSeries: series });
  });

  createExamSeries = asyncHandler(async (req, res) => {
    const schoolId = req.user.roles.includes('admin') ? parseInt(req.body.schoolId, 10) : req.user.schoolId;
    const { name, year, term, startDate, endDate } = req.body;
    
    if (!name || !year) {
      throw new ValidationError('Name and year are required', [
        { field: 'name', message: 'Name is required' },
        { field: 'year', message: 'Year is required' },
      ]);
    }

    const seriesId = await schoolService.createExamSeries(schoolId, { name, year, term, startDate, endDate }, req.user);
    res.status(201).json({ id: seriesId, message: 'Exam series created successfully' });
  });

  updateExamSeries = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.seriesId, 10);
    const { name, year, term, startDate, endDate, isActive } = req.body;
    
    const data = {};
    if (name !== undefined) data.name = name;
    if (year !== undefined) data.year = year;
    if (term !== undefined) data.term = term;
    if (startDate !== undefined) data.start_date = startDate;
    if (endDate !== undefined) data.end_date = endDate;
    if (isActive !== undefined) data.is_active = isActive;

    await schoolService.updateExamSeries(id, data, req.user);
    res.json({ message: 'Exam series updated successfully' });
  });

  deleteExamSeries = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.seriesId, 10);
    await schoolService.deleteExamSeries(id, req.user);
    res.json({ message: 'Exam series deleted successfully' });
  });
}

export const schoolController = new SchoolController();