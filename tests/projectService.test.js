jest.mock('../src/models', () => ({
  Project: { findByPk: jest.fn(), create: jest.fn() },
  Task: { findByPk: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
  Service: {},
  User: {},
  Quote: { findByPk: jest.fn() },
  Payment: { findOne: jest.fn() },
}));

jest.mock('sequelize', () => ({
  Op: { in: Symbol('in'), ne: Symbol('ne'), iLike: Symbol('iLike') },
}));

jest.mock('../src/services/refundService', () => ({
  createRefundRequest: jest.fn(),
}));

const svc = require('../src/services/projectService');
const { Project, Task, Quote, Payment } = require('../src/models');
const refundService = require('../src/services/refundService');

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

    // Firma vigente: (quoteId, status, estimatedPrice, user, io)
    const result = await svc.updateQuoteStatus('quote-1', 'aceptada', null, { id: 'admin-1', role: 'admin' });

    expect(Project.create).toHaveBeenCalled();
    expect(Task.create).toHaveBeenCalledWith(expect.objectContaining({ project_id: 'project-1', created_by: 'admin-1' }));
    expect(quoteUpdate).toHaveBeenCalledWith({ status: 'aceptada', project_id: 'project-1', agreed_price: 1000000 });
    expect(result).toMatchObject({ id: 'quote-1', status: 'aceptada', project_id: 'project-1' });
  });

  test('client cannot accept or reject their own quote (worker-only action)', async () => {
    Quote.findByPk.mockResolvedValue({
      id: 'quote-1',
      worker_id: 'worker-1',
      client_id: 'client-1',
      status: 'solicitud_pendiente',
      estimated_price: 500000,
      update: jest.fn(),
    });

    await expect(
      svc.updateQuoteStatus('quote-1', 'aceptada', null, { id: 'client-1', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 403, message: 'Sin permiso' });
  });

  test('worker accepting a quote uses its fixed price as the project budget', async () => {
    const quoteUpdate = jest.fn();
    const quoteReload = jest.fn().mockResolvedValue({ id: 'quote-1', status: 'aceptada', project_id: 'project-2' });
    Quote.findByPk.mockResolvedValue({
      id: 'quote-1',
      worker_id: 'worker-1',
      client_id: 'client-1',
      city: 'Medellin',
      address: 'Calle 1',
      sq_meters: null,
      occupied: false,
      start_date: null,
      end_date: null,
      service_id: 'service-1',
      project_id: null,
      status: 'solicitud_pendiente',
      estimated_price: 700000,
      service: { name: 'Plomería' },
      update: quoteUpdate,
      reload: quoteReload,
    });
    Project.create.mockResolvedValue({ id: 'project-2' });
    Task.create.mockResolvedValue({ id: 'task-2' });

    await svc.updateQuoteStatus('quote-1', 'aceptada', null, { id: 'worker-1', role: 'trabajador' });

    expect(Project.create).toHaveBeenCalledWith(expect.objectContaining({ budget: 700000 }));
    expect(quoteUpdate).toHaveBeenCalledWith({ status: 'aceptada', project_id: 'project-2', agreed_price: 700000 });
  });
});

describe('projectService.updateProjectStatus — cancelación y reembolsos', () => {
  beforeEach(() => jest.clearAllMocks());

  test('cancelling a project with no approved initial payment does not create a refund request', async () => {
    const update = jest.fn().mockResolvedValue();
    const reload = jest.fn().mockResolvedValue({ id: 'p1', status: 'cancelado' });
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', update, reload });
    Payment.findOne.mockResolvedValue(null);

    await svc.updateProjectStatus('p1', 'cancelado', { id: 'c1', role: 'cliente' });

    expect(refundService.createRefundRequest).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ status: 'cancelado' });
  });

  test('cancelling a project with an approved initial payment creates a refund request with the bank details provided', async () => {
    const update = jest.fn().mockResolvedValue();
    const reload = jest.fn().mockResolvedValue({ id: 'p1', status: 'cancelado' });
    const project = { id: 'p1', client_id: 'c1', update, reload };
    Project.findByPk.mockResolvedValue(project);
    const approvedPayment = { id: 'pay1', type: 'inicial', status: 'aprobado' };
    Payment.findOne.mockResolvedValue(approvedPayment);
    const bankDetails = { bank_name: 'Bancolombia', account_type: 'ahorros', account_number: '123', account_holder_id_number: '456' };

    await svc.updateProjectStatus('p1', 'cancelado', { id: 'c1', role: 'cliente' }, bankDetails);

    expect(refundService.createRefundRequest).toHaveBeenCalledWith(project, approvedPayment, bankDetails);
  });
});
