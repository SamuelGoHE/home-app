jest.mock('../src/models', () => ({
  Payment: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  Project: { findByPk: jest.fn() },
  Task: { update: jest.fn() },
}));

jest.mock('../src/config/wompi', () => ({
  wompi: { post: jest.fn() },
}));

jest.mock('../src/utils/verifyWompiSignature', () => ({
  verifyWompiSignature: jest.fn(),
}));

jest.mock('../src/config/redis', () => ({
  redisClient: { get: jest.fn(), setEx: jest.fn() },
}));

const svc = require('../src/services/paymentService');
const { Payment, Project, Task } = require('../src/models');
const { wompi } = require('../src/config/wompi');
const { verifyWompiSignature } = require('../src/utils/verifyWompiSignature');
const { redisClient } = require('../src/config/redis');

describe('paymentService.createInitialPayment', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects a project that does not belong to the client', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'other-client', status: 'pendiente', budget: 100000 });

    await expect(
      svc.createInitialPayment('p1', { id: 'c1', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(wompi.post).not.toHaveBeenCalled();
  });

  test('rejects a project that already started, finished or was cancelled', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', status: 'en_progreso', budget: 100000 });

    await expect(
      svc.createInitialPayment('p1', { id: 'c1', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('allows creating the initial payment while the project is en_revision (pre-progress)', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', status: 'en_revision', budget: 100000, title: 'Pintura' });
    Payment.findOne.mockResolvedValue(null);
    wompi.post.mockResolvedValue({ data: { data: { id: 'link-123' } } });
    Payment.create.mockResolvedValue({ id: 'pay1' });

    const result = await svc.createInitialPayment('p1', { id: 'c1', role: 'cliente' });

    expect(result).toEqual({ paymentId: 'pay1', url: 'https://checkout.wompi.co/l/link-123' });
  });

  test('rejects a project without an agreed budget', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', status: 'pendiente', budget: null });

    await expect(
      svc.createInitialPayment('p1', { id: 'c1', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects a project whose initial payment was already approved', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', status: 'pendiente', budget: 100000 });
    Payment.findOne.mockResolvedValue({ id: 'pay1', status: 'aprobado' });

    await expect(
      svc.createInitialPayment('p1', { id: 'c1', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test('creates a payment link for 20% of the project budget', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', status: 'pendiente', budget: 100000, title: 'Pintura' });
    Payment.findOne.mockResolvedValue(null);
    wompi.post.mockResolvedValue({ data: { data: { id: 'link-123' } } });
    Payment.create.mockResolvedValue({ id: 'pay1' });

    const result = await svc.createInitialPayment('p1', { id: 'c1', role: 'cliente' });

    expect(wompi.post).toHaveBeenCalledWith('/payment_links', expect.objectContaining({
      amount_in_cents: 2_000_000, // 20% de 100000 = 20000 -> 2,000,000 centavos
      currency: 'COP',
    }));
    expect(Payment.create).toHaveBeenCalledWith(expect.objectContaining({
      type: 'inicial',
      amount: 20000,
      status: 'pendiente',
      project_id: 'p1',
      client_id: 'c1',
    }));
    expect(result).toEqual({ paymentId: 'pay1', url: 'https://checkout.wompi.co/l/link-123' });
  });

  test('wraps a Wompi API failure into a clean 502 instead of leaking the raw axios error', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', status: 'pendiente', budget: 100000, title: 'Pintura' });
    Payment.findOne.mockResolvedValue(null);
    wompi.post.mockRejectedValue({ response: { status: 401, data: { error: { reason: 'Llave no válida' } } } });

    await expect(
      svc.createInitialPayment('p1', { id: 'c1', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 502 });
    expect(Payment.create).not.toHaveBeenCalled();
  });
});

describe('paymentService.getPaymentStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects a user unrelated to the project', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', worker_id: 'w1' });

    await expect(
      svc.getPaymentStatus('p1', { id: 'other', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('returns payments for the owning client', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', worker_id: 'w1' });
    Payment.findAll.mockResolvedValue([{ id: 'pay1' }]);

    const result = await svc.getPaymentStatus('p1', { id: 'c1', role: 'cliente' });

    expect(result).toEqual([{ id: 'pay1' }]);
  });
});

describe('paymentService.handleWompiWebhook', () => {
  beforeEach(() => jest.clearAllMocks());

  const validPayload = {
    timestamp: 123,
    signature: { properties: ['transaction.id'], checksum: 'abc' },
    data: { transaction: { id: 'tx1', status: 'APPROVED', reference: 'home-inicial-p1-xyz', payment_method_type: 'CARD' } },
  };

  test('rejects an invalid signature', async () => {
    verifyWompiSignature.mockReturnValue(false);

    await expect(svc.handleWompiWebhook(validPayload, null)).rejects.toMatchObject({ statusCode: 401 });
    expect(Payment.findOne).not.toHaveBeenCalled();
  });

  test('ignores an event with no matching payment reference', async () => {
    verifyWompiSignature.mockReturnValue(true);
    redisClient.get.mockResolvedValue(null);
    Payment.findOne.mockResolvedValue(null);

    await svc.handleWompiWebhook(validPayload, null);

    expect(Project.findByPk).not.toHaveBeenCalled();
  });

  test('approves the payment and flips a pendiente project to en_progreso', async () => {
    verifyWompiSignature.mockReturnValue(true);
    redisClient.get.mockResolvedValue(null);
    const paymentUpdate = jest.fn().mockResolvedValue();
    Payment.findOne.mockResolvedValue({ id: 'pay1', type: 'inicial', project_id: 'p1', update: paymentUpdate });
    const projectUpdate = jest.fn().mockResolvedValue();
    const emit = jest.fn();
    Project.findByPk.mockResolvedValue({ id: 'p1', status: 'pendiente', client_id: 'c1', worker_id: 'w1', update: projectUpdate });
    const io = { to: jest.fn(() => ({ emit })) };

    await svc.handleWompiWebhook(validPayload, io);

    expect(paymentUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'aprobado' }));
    expect(projectUpdate).toHaveBeenCalledWith({ status: 'en_progreso' });
    expect(Task.update).toHaveBeenCalledWith({ status: 'en_progreso' }, { where: { project_id: 'p1' } });
    expect(io.to).toHaveBeenCalledWith('user:c1');
    expect(io.to).toHaveBeenCalledWith('user:w1');
  });

  test('flips a project stuck in en_revision to en_progreso too (pre-progress, not just pendiente)', async () => {
    verifyWompiSignature.mockReturnValue(true);
    redisClient.get.mockResolvedValue(null);
    const paymentUpdate = jest.fn().mockResolvedValue();
    Payment.findOne.mockResolvedValue({ id: 'pay1', type: 'inicial', project_id: 'p1', update: paymentUpdate });
    const projectUpdate = jest.fn().mockResolvedValue();
    Project.findByPk.mockResolvedValue({ id: 'p1', status: 'en_revision', client_id: 'c1', worker_id: 'w1', update: projectUpdate });

    await svc.handleWompiWebhook(validPayload, null);

    expect(projectUpdate).toHaveBeenCalledWith({ status: 'en_progreso' });
  });

  test('does not touch the project when the project already started, finished or was cancelled', async () => {
    verifyWompiSignature.mockReturnValue(true);
    redisClient.get.mockResolvedValue(null);
    const paymentUpdate = jest.fn().mockResolvedValue();
    Payment.findOne.mockResolvedValue({ id: 'pay1', type: 'inicial', project_id: 'p1', update: paymentUpdate });
    const projectUpdate = jest.fn().mockResolvedValue();
    Project.findByPk.mockResolvedValue({ id: 'p1', status: 'en_progreso', client_id: 'c1', worker_id: 'w1', update: projectUpdate });

    await svc.handleWompiWebhook(validPayload, null);

    expect(projectUpdate).not.toHaveBeenCalled();
  });

  test('skips reprocessing an event already seen (idempotency)', async () => {
    verifyWompiSignature.mockReturnValue(true);
    redisClient.get.mockResolvedValue('1');

    await svc.handleWompiWebhook(validPayload, null);

    expect(Payment.findOne).not.toHaveBeenCalled();
  });
});
