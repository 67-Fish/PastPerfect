import { paperService } from './service.js';
import { asyncHandler, ValidationError } from '../../shared/middleware/errorHandler.js';
import { requireRole } from '../../shared/middleware/auth.js';
import { queryOne } from '../../shared/database/pool.js';

export class PaperController {
  create = asyncHandler(async (req, res) => {
    const { subjectId, examSeriesId, title, description, gradeLevel, paperType, durationMinutes, totalMarks, publish } = req.body;
    const file = req.file;

    if (!file) {
      throw new ValidationError('PDF file is required', [{ field: 'file', message: 'File is required' }]);
    }

    const paperData = {
      subjectId: parseInt(subjectId, 10),
      examSeriesId: parseInt(examSeriesId, 10),
      title: title?.trim(),
      description: description?.trim() || null,
      gradeLevel: gradeLevel?.trim() || null,
      paperType: paperType || 'exam',
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
      totalMarks: totalMarks ? parseInt(totalMarks, 10) : null,
      publish: publish === 'true' || publish === true,
    };

    const paper = await paperService.createPaper(req.user, paperData, file);
    
    res.status(201).json({ paper, message: 'Paper uploaded successfully' });
  });

  list = asyncHandler(async (req, res) => {
    const { subject, examSeries, grade, status, paperType, search, page = 1, limit = 20, orderBy = 'created_at', orderDir = 'DESC' } = req.query;

    const filters = {
      subject: subject ? parseInt(subject, 10) : undefined,
      examSeries: examSeries ? parseInt(examSeries, 10) : undefined,
      grade: grade?.trim(),
      status: status?.trim(),
      paperType: paperType?.trim(),
      search: search?.trim(),
    };

    const options = {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      orderBy,
      orderDir: orderDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
    };

    const result = await paperService.getPapers(req.user, filters, options);
    
    res.json({
      papers: result.data,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / options.limit),
      },
    });
  });

  getById = asyncHandler(async (req, res) => {
    const paperId = parseInt(req.params.id, 10);
    const paper = await paperService.getPaperById(paperId, req.user.schoolId);
    
    res.json({ paper });
  });

  download = asyncHandler(async (req, res) => {
    const paperId = parseInt(req.params.id, 10);
    const file = await paperService.getPaperFile(paperId, req.user.schoolId);
    
    const paper = await paperService.getPaperById(paperId, req.user.schoolId);
    
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', file.file_size);
    res.setHeader('Content-Disposition', `inline; filename="${file.file_name}"`);
    res.send(file.file_data);
  });

  view = asyncHandler(async (req, res) => {
    const paperId = parseInt(req.params.id, 10);
    const file = await paperService.getPaperFile(paperId, req.user.schoolId);
    
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', file.file_size);
    res.setHeader('Content-Disposition', `inline; filename="${file.file_name}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.send(file.file_data);
  });

  update = asyncHandler(async (req, res) => {
    const paperId = parseInt(req.params.id, 10);
    const { subjectId, examSeriesId, title, description, gradeLevel, paperType, durationMinutes, totalMarks, publish } = req.body;
    const file = req.file;

    const paperData = {};
    if (subjectId) paperData.subjectId = parseInt(subjectId, 10);
    if (examSeriesId) paperData.examSeriesId = parseInt(examSeriesId, 10);
    if (title !== undefined) paperData.title = title.trim();
    if (description !== undefined) paperData.description = description.trim() || null;
    if (gradeLevel !== undefined) paperData.gradeLevel = gradeLevel.trim() || null;
    if (paperType !== undefined) paperData.paperType = paperType;
    if (durationMinutes !== undefined) paperData.durationMinutes = durationMinutes ? parseInt(durationMinutes, 10) : null;
    if (totalMarks !== undefined) paperData.totalMarks = totalMarks ? parseInt(totalMarks, 10) : null;
    if (publish !== undefined) paperData.publish = publish === 'true' || publish === true;

    const paper = await paperService.updatePaper(req.user, paperId, paperData, file);
    
    res.json({ paper, message: 'Paper updated successfully' });
  });

  delete = asyncHandler(async (req, res) => {
    const paperId = parseInt(req.params.id, 10);
    await paperService.deletePaper(req.user, paperId);
    
    res.json({ message: 'Paper deleted successfully' });
  });

  getGrades = asyncHandler(async (req, res) => {
    const grades = await paperService.getGrades(req.user);
    res.json({ grades });
  });

  getRelated = asyncHandler(async (req, res) => {
    const paperId = parseInt(req.params.id, 10);
    const related = await paperService.getRelatedPapers(paperId, req.user.schoolId);
    res.json({ papers: related });
  });
}

export const paperController = new PaperController();