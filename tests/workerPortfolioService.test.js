jest.mock('../src/models', () => ({
  WorkerPortfolioPhoto: { create: jest.fn(), findAll: jest.fn(), findByPk: jest.fn(), count: jest.fn() },
  WorkerProfile: { findOne: jest.fn() },
}));

jest.mock('../src/utils/storage', () => ({
  uploadPortfolioPhoto: jest.fn(),
  deleteStorageFile: jest.fn(),
}));

const svc = require('../src/services/workerPortfolioService');
const { WorkerPortfolioPhoto, WorkerProfile } = require('../src/models');
const { uploadPortfolioPhoto, deleteStorageFile } = require('../src/utils/storage');

const file = { originalname: 'foto.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('x') };

describe('workerPortfolioService.addPhoto', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects no file', async () => {
    await expect(
      svc.addPhoto('w1', null, 'pintura', null, { id: 'w1', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects an invalid specialty', async () => {
    await expect(
      svc.addPhoto('w1', file, 'invalida', null, { id: 'w1', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects a user managing someone else\'s portfolio', async () => {
    await expect(
      svc.addPhoto('w1', file, 'pintura', null, { id: 'other', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(uploadPortfolioPhoto).not.toHaveBeenCalled();
  });

  test('rejects a specialty not in the worker profile', async () => {
    WorkerProfile.findOne.mockResolvedValue({ specialties: ['plomeria'] });

    await expect(
      svc.addPhoto('w1', file, 'pintura', null, { id: 'w1', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(uploadPortfolioPhoto).not.toHaveBeenCalled();
  });

  test('allows any valid specialty when the profile has none configured yet', async () => {
    WorkerProfile.findOne.mockResolvedValue({ specialties: [] });
    WorkerPortfolioPhoto.count.mockResolvedValue(0);
    uploadPortfolioPhoto.mockResolvedValue({ url: 'https://x/foto.jpg', path: 'portfolio/w1/foto.jpg' });
    WorkerPortfolioPhoto.create.mockResolvedValue({ id: 'photo1' });

    const result = await svc.addPhoto('w1', file, 'pintura', null, { id: 'w1', role: 'trabajador' });

    expect(uploadPortfolioPhoto).toHaveBeenCalledWith(file, 'w1');
    expect(result).toEqual({ id: 'photo1' });
  });

  test('rejects once the portfolio limit is reached', async () => {
    WorkerProfile.findOne.mockResolvedValue({ specialties: ['pintura'] });
    WorkerPortfolioPhoto.count.mockResolvedValue(svc.PORTFOLIO_LIMIT);

    await expect(
      svc.addPhoto('w1', file, 'pintura', null, { id: 'w1', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(uploadPortfolioPhoto).not.toHaveBeenCalled();
  });

  test('uploads and creates a photo for a valid specialty', async () => {
    WorkerProfile.findOne.mockResolvedValue({ specialties: ['pintura', 'plomeria'] });
    WorkerPortfolioPhoto.count.mockResolvedValue(3);
    uploadPortfolioPhoto.mockResolvedValue({ url: 'https://x/foto.jpg', path: 'portfolio/w1/foto.jpg' });
    WorkerPortfolioPhoto.create.mockResolvedValue({ id: 'photo1' });

    const result = await svc.addPhoto('w1', file, 'pintura', 'Fachada completa', { id: 'w1', role: 'trabajador' });

    expect(WorkerPortfolioPhoto.create).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://x/foto.jpg',
      storage_path: 'portfolio/w1/foto.jpg',
      specialty: 'pintura',
      caption: 'Fachada completa',
      worker_id: 'w1',
    }));
    expect(result).toEqual({ id: 'photo1' });
  });

  test('admin can upload to any worker\'s portfolio', async () => {
    WorkerProfile.findOne.mockResolvedValue({ specialties: ['pintura'] });
    WorkerPortfolioPhoto.count.mockResolvedValue(0);
    uploadPortfolioPhoto.mockResolvedValue({ url: 'https://x/foto.jpg', path: 'portfolio/w1/foto.jpg' });
    WorkerPortfolioPhoto.create.mockResolvedValue({ id: 'photo1' });

    await expect(
      svc.addPhoto('w1', file, 'pintura', null, { id: 'admin1', role: 'admin' })
    ).resolves.toEqual({ id: 'photo1' });
  });
});

describe('workerPortfolioService.listPhotos', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns photos for a worker, most recent first', async () => {
    WorkerPortfolioPhoto.findAll.mockResolvedValue([{ id: 'photo1' }]);

    const result = await svc.listPhotos('w1');

    expect(WorkerPortfolioPhoto.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { worker_id: 'w1' },
    }));
    expect(result).toEqual([{ id: 'photo1' }]);
  });
});

describe('workerPortfolioService.deletePhoto', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects deletion by someone who is not the owner and not admin', async () => {
    WorkerPortfolioPhoto.findByPk.mockResolvedValue({ id: 'photo1', worker_id: 'w1', storage_path: 'x.jpg', destroy: jest.fn() });

    await expect(
      svc.deletePhoto('photo1', { id: 'other-worker', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(deleteStorageFile).not.toHaveBeenCalled();
  });

  test('allows the owner to delete their own photo', async () => {
    const destroy = jest.fn().mockResolvedValue();
    WorkerPortfolioPhoto.findByPk.mockResolvedValue({ id: 'photo1', worker_id: 'w1', storage_path: 'x.jpg', destroy });

    await svc.deletePhoto('photo1', { id: 'w1', role: 'trabajador' });

    expect(deleteStorageFile).toHaveBeenCalledWith('x.jpg');
    expect(destroy).toHaveBeenCalled();
  });

  test('rejects deleting a photo that does not exist', async () => {
    WorkerPortfolioPhoto.findByPk.mockResolvedValue(null);

    await expect(
      svc.deletePhoto('missing', { id: 'w1', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
