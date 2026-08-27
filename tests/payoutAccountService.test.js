jest.mock('../src/models', () => ({
  WorkerPayoutAccount: { findOrCreate: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() },
}));

const svc = require('../src/services/payoutAccountService');
const { WorkerPayoutAccount } = require('../src/models');

describe('payoutAccountService.registerAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  const validData = {
    bank_name: 'Bancolombia',
    account_type: 'ahorros',
    account_number: '1234567890',
    account_holder_id_number: '123456789',
  };

  test('rejects missing fields', async () => {
    await expect(
      svc.registerAccount('w1', { ...validData, bank_name: '' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(WorkerPayoutAccount.findOrCreate).not.toHaveBeenCalled();
  });

  test('rejects an invalid account_type', async () => {
    await expect(
      svc.registerAccount('w1', { ...validData, account_type: 'invalida' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('stores only the last 4 digits of the account number', async () => {
    const update = jest.fn().mockResolvedValue();
    WorkerPayoutAccount.findOrCreate.mockResolvedValue([{ update }, true]);

    await svc.registerAccount('w1', validData);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      account_number_last4: '7890',
      verified: false,
      verified_by: null,
      verified_at: null,
    }));
  });

  test('resets verification when an existing account is corrected', async () => {
    const update = jest.fn().mockResolvedValue();
    WorkerPayoutAccount.findOrCreate.mockResolvedValue([{ update, verified: true }, false]);

    await svc.registerAccount('w1', validData);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ verified: false }));
  });
});

describe('payoutAccountService.verifyAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects an account that does not exist', async () => {
    WorkerPayoutAccount.findByPk.mockResolvedValue(null);
    await expect(
      svc.verifyAccount('acc1', { id: 'af1' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test('marks the account verified and records who approved it', async () => {
    const update = jest.fn().mockResolvedValue();
    WorkerPayoutAccount.findByPk.mockResolvedValue({ id: 'acc1', update });

    await svc.verifyAccount('acc1', { id: 'af1' });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ verified: true, verified_by: 'af1' }));
  });
});
