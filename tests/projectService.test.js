jest.mock('../src/models', () => ({
  Project: { findByPk: jest.fn(), create: jest.fn(), findAll: jest.fn(), findAndCountAll: jest.fn() },
  Task: { findByPk: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
  Service: { findByPk: jest.fn(), findAll: jest.fn() },
  User: { findOne: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
  Quote: { findByPk: jest.fn(), create: jest.fn(), findAll: jest.fn() },
  WorkerServiceRate: { findOne: jest.fn() },
  Payment: { findOne: jest.fn() },
}));

jest.mock('sequelize', () => ({
  Op: { in: Symbol('in'), ne: Symbol('ne'), iLike: Symbol('iLike') },
}));

jest.mock('../src/services/refundService', () => ({
  createRefundRequest: jest.fn(),
}));

const svc = require('../src/services/projectService');
const { Project, Task, Service, User, Quote, WorkerServiceRate, Payment } = require('../src/models');
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

describe('projectService.createQuote — precio tomado de la tarifa publicada', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Service.findByPk.mockResolvedValue({ id: 'srv-1', name: 'Pintura', category: 'pintura' });
    User.findOne.mockResolvedValue({ id: 'w-1', role: 'trabajador' });
    User.findByPk.mockResolvedValue({ id: 'c-1', name: 'Cliente' });
    Quote.create.mockImplementation(async (payload) => ({ id: 'q-1', ...payload }));
  });

  const baseData = { service_id: 'srv-1', worker_id: 'w-1', city: 'Medellin', address: 'Calle 1' };

  test('rechaza la solicitud si el trabajador no publicó precio para la categoría', async () => {
    WorkerServiceRate.findOne.mockResolvedValue(null);

    await expect(svc.createQuote(baseData, 'c-1'))
      .rejects.toMatchObject({ statusCode: 400, message: 'Este trabajador no tiene un precio publicado para este servicio' });
  });

  test('por_dia: congela la tarifa como estimated_price y conserva end_date', async () => {
    WorkerServiceRate.findOne.mockResolvedValue({ id: 'rate-1', price_unit: 'por_dia', amount: '80000.00' });

    const quote = await svc.createQuote({ ...baseData, end_date: '2026-09-10' }, 'c-1');

    expect(quote.pricing_type).toBe('por_dia');
    expect(quote.estimated_price).toBe(80000);
    expect(quote.end_date).toBe('2026-09-10');
    expect(quote.service_rate_id).toBe('rate-1');
  });

  test('por_m2: multiplica la tarifa por los metros e ignora end_date', async () => {
    WorkerServiceRate.findOne.mockResolvedValue({ id: 'rate-2', price_unit: 'por_m2', amount: '25000.00' });

    const quote = await svc.createQuote({ ...baseData, sq_meters: 40, end_date: '2026-09-10' }, 'c-1');

    expect(quote.estimated_price).toBe(1000000);
    expect(quote.end_date).toBeNull();
  });

  test('a_convenir: deja estimated_price en null pero registra la tarifa usada', async () => {
    WorkerServiceRate.findOne.mockResolvedValue({ id: 'rate-3', price_unit: 'a_convenir', amount: null });

    const quote = await svc.createQuote(baseData, 'c-1');

    expect(quote.estimated_price).toBeNull();
    expect(quote.service_rate_id).toBe('rate-3');
  });
});

describe('projectService.getProjects — filtrado por rol', () => {
  beforeEach(() => { jest.clearAllMocks(); Project.findAndCountAll.mockResolvedValue({ rows: [], count: 0 }); });

  test('un cliente solo ve sus propios proyectos', async () => {
    await svc.getProjects({ id: 'c-1', role: 'cliente' });
    expect(Project.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ where: { client_id: 'c-1' } }));
  });

  test('un trabajador solo ve los proyectos donde está asignado', async () => {
    await svc.getProjects({ id: 'w-1', role: 'trabajador' });
    expect(Project.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ where: { worker_id: 'w-1' } }));
  });

  test('un admin ve todos (sin filtro por usuario)', async () => {
    await svc.getProjects({ id: 'a-1', role: 'admin' });
    expect(Project.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  test('propaga limit/offset y devuelve { rows, count }', async () => {
    Project.findAndCountAll.mockResolvedValue({ rows: [{ id: 'p-1' }], count: 42 });
    const result = await svc.getProjects({ id: 'a-1', role: 'admin' }, { limit: 20, offset: 40 });
    expect(Project.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 20, offset: 40, distinct: true }));
    expect(result).toEqual({ rows: [{ id: 'p-1' }], count: 42 });
  });
});

describe('projectService.createProject', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rechaza si el servicio no existe (404)', async () => {
    Service.findByPk.mockResolvedValue(null);
    await expect(svc.createProject({ service_id: 's-x', client_id: 'c-1' }, 'a-1'))
      .rejects.toMatchObject({ statusCode: 404, message: 'Servicio no encontrado' });
  });

  test('rechaza si el cliente no existe (404)', async () => {
    Service.findByPk.mockResolvedValue({ id: 's-1' });
    User.findOne.mockResolvedValue(null);
    await expect(svc.createProject({ service_id: 's-1', client_id: 'c-x' }, 'a-1'))
      .rejects.toMatchObject({ statusCode: 404, message: 'Cliente no encontrado' });
  });

  test('crea el proyecto asignándole el admin que lo genera', async () => {
    Service.findByPk.mockResolvedValue({ id: 's-1' });
    User.findOne.mockResolvedValue({ id: 'c-1', role: 'cliente' });
    Project.create.mockResolvedValue({ id: 'p-1' });

    await svc.createProject({ service_id: 's-1', client_id: 'c-1' }, 'a-1');

    expect(Project.create).toHaveBeenCalledWith(expect.objectContaining({ admin_id: 'a-1', client_id: 'c-1' }));
  });
});

describe('projectService.deleteProject', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rechaza si el proyecto no existe (404)', async () => {
    Project.findByPk.mockResolvedValue(null);
    await expect(svc.deleteProject('p-x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('destruye el proyecto cuando existe', async () => {
    const destroy = jest.fn().mockResolvedValue();
    Project.findByPk.mockResolvedValue({ id: 'p-1', destroy });
    await svc.deleteProject('p-1');
    expect(destroy).toHaveBeenCalled();
  });
});

describe('projectService.createTask', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rechaza si el proyecto no existe (404)', async () => {
    Project.findByPk.mockResolvedValue(null);
    await expect(svc.createTask({ project_id: 'p-x' }, 'a-1')).rejects.toMatchObject({ statusCode: 404, message: 'Proyecto no encontrado' });
  });

  test('rechaza si se asigna a un trabajador inexistente (404)', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p-1' });
    User.findOne.mockResolvedValue(null);
    await expect(svc.createTask({ project_id: 'p-1', assigned_to: 'w-x' }, 'a-1'))
      .rejects.toMatchObject({ statusCode: 404, message: 'Trabajador no encontrado' });
  });

  test('crea la tarea registrando quién la creó', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p-1' });
    Task.create.mockResolvedValue({ id: 't-1' });
    await svc.createTask({ project_id: 'p-1', title: 'Pintar' }, 'a-1');
    expect(Task.create).toHaveBeenCalledWith(expect.objectContaining({ created_by: 'a-1', title: 'Pintar' }));
  });
});

describe('projectService.assignTask', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rechaza si la tarea no existe (404)', async () => {
    Task.findByPk.mockResolvedValue(null);
    await expect(svc.assignTask('t-x', 'w-1')).rejects.toMatchObject({ statusCode: 404, message: 'Tarea no encontrada' });
  });

  test('rechaza si el trabajador no existe (404)', async () => {
    Task.findByPk.mockResolvedValue({ id: 't-1', update: jest.fn(), reload: jest.fn() });
    User.findOne.mockResolvedValue(null);
    await expect(svc.assignTask('t-1', 'w-x')).rejects.toMatchObject({ statusCode: 404, message: 'Trabajador no encontrado' });
  });

  test('asigna la tarea y la pone en progreso', async () => {
    const update = jest.fn().mockResolvedValue();
    const reload = jest.fn().mockResolvedValue({ id: 't-1' });
    Task.findByPk.mockResolvedValue({ id: 't-1', update, reload });
    User.findOne.mockResolvedValue({ id: 'w-1', role: 'trabajador' });
    await svc.assignTask('t-1', 'w-1');
    expect(update).toHaveBeenCalledWith({ assigned_to: 'w-1', status: 'en_progreso' });
  });
});

describe('projectService.updateProjectStatus — permisos y sincronización de tareas', () => {
  beforeEach(() => jest.clearAllMocks());

  test('un trabajador no puede enviar a un estado fuera de revisión/completado (400)', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p-1', worker_id: 'w-1' });
    await expect(svc.updateProjectStatus('p-1', 'cancelado', { id: 'w-1', role: 'trabajador' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('un cliente que no es dueño del proyecto no puede modificarlo (403)', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p-1', client_id: 'otro' });
    await expect(svc.updateProjectStatus('p-1', 'aprobado', { id: 'c-1', role: 'cliente' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('un rol no autorizado no puede cambiar el estado (403)', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p-1' });
    await expect(svc.updateProjectStatus('p-1', 'completado', { id: 'x', role: 'invitado' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('completar fija actual_end_date y sincroniza las tareas a completada', async () => {
    const update = jest.fn().mockResolvedValue();
    const reload = jest.fn().mockResolvedValue({ id: 'p-1', status: 'completado' });
    Project.findByPk.mockResolvedValue({ id: 'p-1', worker_id: 'w-1', update, reload });

    await svc.updateProjectStatus('p-1', 'completado', { id: 'w-1', role: 'trabajador' });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completado', actual_end_date: expect.any(Date) }));
    expect(Task.update).toHaveBeenCalledWith({ status: 'completada' }, { where: { project_id: 'p-1' } });
  });
});

describe('projectService.updateQuoteStatus — validaciones del trabajador', () => {
  beforeEach(() => jest.clearAllMocks());

  const pendingQuote = (overrides = {}) => ({
    id: 'q-1', worker_id: 'w-1', client_id: 'c-1', status: 'solicitud_pendiente',
    estimated_price: 500000, project_id: null,
    update: jest.fn(), reload: jest.fn().mockResolvedValue({ id: 'q-1' }),
    ...overrides,
  });

  test('un trabajador no dueño de la solicitud no puede responderla (403)', async () => {
    Quote.findByPk.mockResolvedValue(pendingQuote({ worker_id: 'otro' }));
    await expect(svc.updateQuoteStatus('q-1', 'aceptada', null, { id: 'w-1', role: 'trabajador' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('un trabajador solo puede aceptar o rechazar, no otros estados (400)', async () => {
    Quote.findByPk.mockResolvedValue(pendingQuote());
    await expect(svc.updateQuoteStatus('q-1', 'revisada', null, { id: 'w-1', role: 'trabajador' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('no se puede responder una solicitud ya respondida (409)', async () => {
    Quote.findByPk.mockResolvedValue(pendingQuote({ status: 'aceptada' }));
    await expect(svc.updateQuoteStatus('q-1', 'rechazada', null, { id: 'w-1', role: 'trabajador' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('aceptar sin precio (ni en la solicitud ni en el request) es rechazado (400)', async () => {
    Quote.findByPk.mockResolvedValue(pendingQuote({ estimated_price: null }));
    await expect(svc.updateQuoteStatus('q-1', 'aceptada', null, { id: 'w-1', role: 'trabajador' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('un rol que no es trabajador ni admin no tiene permiso (403)', async () => {
    Quote.findByPk.mockResolvedValue(pendingQuote());
    await expect(svc.updateQuoteStatus('q-1', 'aceptada', null, { id: 'c-1', role: 'cliente' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});
