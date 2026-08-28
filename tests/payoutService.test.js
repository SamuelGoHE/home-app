jest.mock('../src/models', () => ({
  Payout: { findAll: jest.fn(), findByPk: jest.fn() },
  Refund: { findByPk: jest.fn() },
  WorkerPayoutAccount: { findOne: jest.fn() },
  Project: {},
  User: { findByPk: jest.fn() },
}));

jest.mock('../src/config/wompiPayouts', () => ({
  wompiPayouts: { post: jest.fn() },
  sourceAccountId: 'source-account-1',
  eventsSecret: 'payouts-secret',
  getBankId: jest.fn(),
}));

jest.mock('../src/utils/verifyWompiSignature', () => ({
  verifyWompiSignature: jest.fn(),
}));

const svc = require('../src/services/payoutService');
const { Payout, Refund, WorkerPayoutAccount, User } = require('../src/models');
const { wompiPayouts, getBankId } = require('../src/config/wompiPayouts');
const { verifyWompiSignature } = require('../src/utils/verifyWompiSignature');

describe('payoutService.listPayouts', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects a role with no business in payouts', async () => {
    await expect(
      svc.listPayouts({ id: 'x', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(Payout.findAll).not.toHaveBeenCalled();
  });

  test('scopes a trabajador to their own payouts', async () => {
    Payout.findAll.mockResolvedValue([]);
    await svc.listPayouts({ id: 'w1', role: 'trabajador' });
    expect(Payout.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { worker_id: 'w1' },
    }));
  });

  test('lets admin_finanzas see all payouts, optionally filtered by status', async () => {
    Payout.findAll.mockResolvedValue([]);
    await svc.listPayouts({ id: 'af1', role: 'admin_finanzas' }, 'pendiente');
    expect(Payout.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'pendiente' },
    }));
  });
});

describe('payoutService.approvePayout', () => {
  beforeEach(() => jest.clearAllMocks());

  const future = new Date(Date.now() + 60 * 60 * 1000);
  const past = new Date(Date.now() - 60 * 60 * 1000);

  test('rejects a payout that is not pendiente', async () => {
    Payout.findByPk.mockResolvedValue({ id: 'po1', status: 'enviado', eligible_at: past });
    await expect(
      svc.approvePayout('po1', { id: 'af1' })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test('rejects a payout before its eligible_at window', async () => {
    Payout.findByPk.mockResolvedValue({ id: 'po1', status: 'pendiente', eligible_at: future });
    await expect(
      svc.approvePayout('po1', { id: 'af1' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(WorkerPayoutAccount.findOne).not.toHaveBeenCalled();
  });

  test('rejects a worker with no payout account registered', async () => {
    Payout.findByPk.mockResolvedValue({ id: 'po1', status: 'pendiente', eligible_at: past, worker_id: 'w1' });
    WorkerPayoutAccount.findOne.mockResolvedValue(null);
    await expect(
      svc.approvePayout('po1', { id: 'af1' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects a worker whose payout account is not verified', async () => {
    Payout.findByPk.mockResolvedValue({ id: 'po1', status: 'pendiente', eligible_at: past, worker_id: 'w1' });
    WorkerPayoutAccount.findOne.mockResolvedValue({ verified: false });
    await expect(
      svc.approvePayout('po1', { id: 'af1' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('sends the payout to Wompi and marks it enviado', async () => {
    const update = jest.fn().mockResolvedValue();
    const reload = jest.fn().mockResolvedValue({ id: 'po1', status: 'enviado' });
    Payout.findByPk.mockResolvedValue({ id: 'po1', status: 'pendiente', eligible_at: past, worker_id: 'w1', amount: 80000, update, reload });
    WorkerPayoutAccount.findOne.mockResolvedValue({
      verified: true, bank_name: 'Bancolombia', account_type: 'ahorros',
      account_number: '1234567890', account_holder_id_number: '999888777',
    });
    User.findByPk.mockResolvedValue({ id: 'w1', name: 'Worker Test', email: 'w@test.com' });
    getBankId.mockResolvedValue('bank-uuid-1');
    wompiPayouts.post.mockResolvedValue({ data: { data: { id: 'wompi-payout-1' } } });

    await svc.approvePayout('po1', { id: 'af1' });

    expect(wompiPayouts.post).toHaveBeenCalledWith('/payouts', expect.objectContaining({
      accountId: 'source-account-1',
      paymentType: 'PROVIDERS',
      transactions: [expect.objectContaining({
        bankId: 'bank-uuid-1',
        accountNumber: '1234567890',
        amount: 8_000_000,
        name: 'Worker Test',
      })],
    }), expect.any(Object));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'enviado', wompi_payout_id: 'wompi-payout-1' }));
  });

  test('leaves the payout pendiente (not fallido) when Wompi rejects the request', async () => {
    const update = jest.fn().mockResolvedValue();
    Payout.findByPk.mockResolvedValue({ id: 'po1', status: 'pendiente', eligible_at: past, worker_id: 'w1', amount: 80000, update });
    WorkerPayoutAccount.findOne.mockResolvedValue({
      verified: true, bank_name: 'Bancolombia', account_type: 'ahorros',
      account_number: '1234567890', account_holder_id_number: '999888777',
    });
    User.findByPk.mockResolvedValue({ id: 'w1', name: 'Worker Test', email: 'w@test.com' });
    getBankId.mockResolvedValue('bank-uuid-1');
    wompiPayouts.post.mockRejectedValue({ response: { status: 400, data: { error: 'bad request' } } });

    await expect(
      svc.approvePayout('po1', { id: 'af1' })
    ).rejects.toMatchObject({ statusCode: 502 });
    expect(update).not.toHaveBeenCalled();
  });
});

describe('payoutService.handleWompiPayoutWebhook', () => {
  beforeEach(() => jest.clearAllMocks());

  const txPayload = (overrides) => ({
    timestamp: 123,
    signature: { properties: ['transaction.id'], checksum: 'abc' },
    data: { transaction: { id: 'tx1', status: 'APPROVED', reference: 'home-payout-po1', ...overrides } },
  });

  test('rejects an invalid signature', async () => {
    verifyWompiSignature.mockReturnValue(false);
    await expect(svc.handleWompiPayoutWebhook(txPayload(), null)).rejects.toMatchObject({ statusCode: 401 });
  });

  test('ignores a non-final status (PENDING) — nothing to update yet', async () => {
    verifyWompiSignature.mockReturnValue(true);
    await svc.handleWompiPayoutWebhook(txPayload({ status: 'PENDING' }), null);
    expect(Payout.findByPk).not.toHaveBeenCalled();
  });

  test('marks a payout completado on APPROVED', async () => {
    verifyWompiSignature.mockReturnValue(true);
    const update = jest.fn().mockResolvedValue();
    Payout.findByPk.mockResolvedValue({ id: 'po1', status: 'enviado', worker_id: 'w1', update });
    const emit = jest.fn();
    const io = { to: jest.fn(() => ({ emit })) };

    await svc.handleWompiPayoutWebhook(txPayload({ status: 'APPROVED' }), io);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completado' }));
    expect(io.to).toHaveBeenCalledWith('user:w1');
  });

  test('marks a payout fallido on FAILED with the failure reason', async () => {
    verifyWompiSignature.mockReturnValue(true);
    const update = jest.fn().mockResolvedValue();
    Payout.findByPk.mockResolvedValue({ id: 'po1', status: 'enviado', worker_id: 'w1', update });

    await svc.handleWompiPayoutWebhook(txPayload({ status: 'FAILED', failureReason: { code: 'C01', message: 'Cuenta inactiva' } }), null);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'fallido', failure_reason: 'Cuenta inactiva' }));
  });

  test('resolves a refund reference instead of a payout', async () => {
    verifyWompiSignature.mockReturnValue(true);
    const update = jest.fn().mockResolvedValue();
    Refund.findByPk.mockResolvedValue({ id: 'r1', status: 'enviado', client_id: 'c1', update });

    await svc.handleWompiPayoutWebhook(txPayload({ reference: 'home-refund-r1', status: 'APPROVED' }), null);

    expect(Payout.findByPk).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completado' }));
  });

  test('ignores an already-resolved payout (not enviado anymore)', async () => {
    verifyWompiSignature.mockReturnValue(true);
    const update = jest.fn();
    Payout.findByPk.mockResolvedValue({ id: 'po1', status: 'completado', worker_id: 'w1', update });

    await svc.handleWompiPayoutWebhook(txPayload({ status: 'APPROVED' }), null);

    expect(update).not.toHaveBeenCalled();
  });
});
