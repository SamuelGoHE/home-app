jest.mock('../src/models', () => ({
  Refund: { create: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() },
  Payment: {},
  Project: {},
  User: {},
}));

jest.mock('../src/config/wompiPayouts', () => ({
  wompiPayouts: { post: jest.fn() },
  sourceAccountId: 'source-account-1',
  getBankId: jest.fn(),
}));

const svc = require('../src/services/refundService');
const { Refund } = require('../src/models');
const { wompiPayouts, getBankId } = require('../src/config/wompiPayouts');

describe('refundService.createRefundRequest', () => {
  beforeEach(() => jest.clearAllMocks());

  const project = { id: 'p1', client_id: 'c1' };
  const payment = { id: 'pay1' };
  const validBankDetails = { bank_name: 'Bancolombia', account_type: 'ahorros', account_number: '123', account_holder_id_number: '456' };

  test('rejects missing bank details', async () => {
    await expect(
      svc.createRefundRequest(project, payment, { ...validBankDetails, bank_name: '' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(Refund.create).not.toHaveBeenCalled();
  });

  test('rejects an invalid account_type', async () => {
    await expect(
      svc.createRefundRequest(project, payment, { ...validBankDetails, account_type: 'invalida' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('creates the refund request tied to the project, client and payment', async () => {
    Refund.create.mockResolvedValue({ id: 'refund1' });

    await svc.createRefundRequest(project, payment, validBankDetails);

    expect(Refund.create).toHaveBeenCalledWith(expect.objectContaining({
      bank_name: 'Bancolombia',
      project_id: 'p1',
      client_id: 'c1',
      payment_id: 'pay1',
    }));
  });
});

describe('refundService.listRefunds', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects a role with no business in refunds', async () => {
    await expect(
      svc.listRefunds({ id: 'w1', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('scopes a cliente to their own refunds', async () => {
    Refund.findAll.mockResolvedValue([]);
    await svc.listRefunds({ id: 'c1', role: 'cliente' });
    expect(Refund.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { client_id: 'c1' } }));
  });

  test('lets admin_finanzas see all, optionally filtered by status', async () => {
    Refund.findAll.mockResolvedValue([]);
    await svc.listRefunds({ id: 'af1', role: 'admin_finanzas' }, 'pendiente');
    expect(Refund.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'pendiente' } }));
  });
});

describe('refundService.approveRefund', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects a refund that does not exist', async () => {
    Refund.findByPk.mockResolvedValue(null);
    await expect(
      svc.approveRefund('r1', { id: 'af1' }, 5000)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test('rejects a refund that was already processed', async () => {
    Refund.findByPk.mockResolvedValue({ id: 'r1', status: 'enviado', payment: { amount: 20000 }, client: {} });
    await expect(
      svc.approveRefund('r1', { id: 'af1' }, 5000)
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test('rejects a missing or negative penalty amount', async () => {
    Refund.findByPk.mockResolvedValue({ id: 'r1', status: 'pendiente', payment: { amount: 20000 }, client: {} });
    await expect(
      svc.approveRefund('r1', { id: 'af1' }, -100)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects a penalty larger than the amount actually paid', async () => {
    Refund.findByPk.mockResolvedValue({ id: 'r1', status: 'pendiente', payment: { amount: 20000 }, client: {} });
    await expect(
      svc.approveRefund('r1', { id: 'af1' }, 25000)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('sends the refund to Wompi for the amount paid minus the penalty', async () => {
    const update = jest.fn().mockResolvedValue();
    const reload = jest.fn().mockResolvedValue({ id: 'r1', status: 'enviado' });
    Refund.findByPk.mockResolvedValue({
      id: 'r1', status: 'pendiente', payment: { amount: 20000 },
      client: { name: 'Client Test', email: 'c@test.com' },
      bank_name: 'Bancolombia', account_type: 'ahorros', account_number: '999', account_holder_id_number: '111',
      update, reload,
    });
    getBankId.mockResolvedValue('bank-uuid-1');
    wompiPayouts.post.mockResolvedValue({ data: { data: { id: 'wompi-refund-1' } } });

    await svc.approveRefund('r1', { id: 'af1' }, 5000);

    expect(wompiPayouts.post).toHaveBeenCalledWith('/payouts', expect.objectContaining({
      paymentType: 'OTHER',
      transactions: [expect.objectContaining({ amount: 1_500_000, name: 'Client Test' })], // (20000-5000)*100
    }), expect.any(Object));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      penalty_amount: 5000, refund_amount: 15000, status: 'enviado', wompi_payout_id: 'wompi-refund-1',
    }));
  });

  test('leaves the refund pendiente (not fallido) when Wompi rejects the request', async () => {
    const update = jest.fn().mockResolvedValue();
    Refund.findByPk.mockResolvedValue({
      id: 'r1', status: 'pendiente', payment: { amount: 20000 },
      client: { name: 'Client Test', email: 'c@test.com' },
      bank_name: 'Bancolombia', account_type: 'ahorros', account_number: '999', account_holder_id_number: '111',
      update,
    });
    getBankId.mockResolvedValue('bank-uuid-1');
    wompiPayouts.post.mockRejectedValue({ response: { status: 400 } });

    await expect(
      svc.approveRefund('r1', { id: 'af1' }, 5000)
    ).rejects.toMatchObject({ statusCode: 502 });
    expect(update).not.toHaveBeenCalled();
  });
});
