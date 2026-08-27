jest.mock('../src/models', () => ({
  Payout: { findAll: jest.fn(), findByPk: jest.fn() },
  WorkerPayoutAccount: { findOne: jest.fn() },
  Project: {},
  User: {},
}));

const svc = require('../src/services/payoutService');
const { Payout, WorkerPayoutAccount } = require('../src/models');

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

  test('an otherwise-eligible payout fails cleanly because sending to Wompi is not implemented yet, and stays pendiente', async () => {
    const update = jest.fn().mockResolvedValue();
    Payout.findByPk.mockResolvedValue({ id: 'po1', status: 'pendiente', eligible_at: past, worker_id: 'w1', update });
    WorkerPayoutAccount.findOne.mockResolvedValue({ verified: true });

    await expect(
      svc.approvePayout('po1', { id: 'af1' })
    ).rejects.toMatchObject({ statusCode: 501 });
    expect(update).not.toHaveBeenCalled();
  });
});
