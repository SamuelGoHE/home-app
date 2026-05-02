jest.mock('../src/models', () => ({
  Project: { findByPk: jest.fn(), create: jest.fn() },
  Task: { findByPk: jest.fn(), count: jest.fn(), create: jest.fn() },
  Service: {},
  User: {},
  Quote: { findByPk: jest.fn() },
}));

jest.mock('sequelize', () => ({
  Op: { in: Symbol('in'), ne: Symbol('ne'), iLike: Symbol('iLike') },
}));

const svc = require('../src/services/projectService');
const { Project, Task, Quote } = require('../src/models');

describe('projectService permission checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('denies project access to worker without assigned tasks', async () => {
    Project.findByPk.mockResolvedValue({ id: 'project-1', client_id: 'client-1' });
    Task.count.mockResolvedValue(0);

    await expect(
      svc.getProjectById('project-1', { id: 'worker-1', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 403, message: 'Sin acceso a este proyecto' });
  });

  test('denies task updates for non-admin non-worker users', async () => {
    Task.findByPk.mockResolvedValue({
      id: 'task-1',
      assigned_to: 'worker-1',
      project_id: 'project-1',
      update: jest.fn(),
      reload: jest.fn(),
      project: { update: jest.fn() },
    });

    await expect(
      svc.updateTask('task-1', { status: 'en_progreso' }, { id: 'client-1', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 403, message: 'Sin acceso a esta tarea' });
  });

  test('approving quote creates a project and initial task', async () => {
    const quoteUpdate = jest.fn();
    const quoteReload = jest.fn().mockResolvedValue({ id: 'quote-1', status: 'aceptada', project_id: 'project-1' });
    Quote.findByPk.mockResolvedValue({
      id: 'quote-1',
      city: 'Medellin',
      address: 'Calle 1',
      notes: 'nota',
      sq_meters: 55,
      occupied: false,
      estimated_price: 1000000,
      start_date: null,
      end_date: null,
      client_id: 'client-1',
      service_id: 'service-1',
      project_id: null,
      service: { name: 'Pintura' },
      update: quoteUpdate,
      reload: quoteReload,
    });
    Project.create.mockResolvedValue({ id: 'project-1' });
    Task.create.mockResolvedValue({ id: 'task-1' });

    const result = await svc.updateQuoteStatus('quote-1', 'aceptada', 'admin-1');

    expect(Project.create).toHaveBeenCalled();
    expect(Task.create).toHaveBeenCalledWith(expect.objectContaining({ project_id: 'project-1', created_by: 'admin-1' }));
    expect(quoteUpdate).toHaveBeenCalledWith({ status: 'aceptada', project_id: 'project-1' });
    expect(result).toMatchObject({ id: 'quote-1', status: 'aceptada', project_id: 'project-1' });
  });
});
