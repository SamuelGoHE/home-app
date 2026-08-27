jest.mock('../src/models', () => ({
  Project: { findByPk: jest.fn() },
  ProjectPhoto: { create: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() },
  User: {},
}));

jest.mock('../src/utils/storage', () => ({
  uploadProjectPhoto: jest.fn(),
  deleteProjectPhotoFile: jest.fn(),
}));

const svc = require('../src/services/projectPhotoService');
const { Project, ProjectPhoto } = require('../src/models');
const { uploadProjectPhoto, deleteProjectPhotoFile } = require('../src/utils/storage');

describe('projectPhotoService.addPhoto', () => {
  beforeEach(() => jest.clearAllMocks());

  const file = { originalname: 'foto.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('x') };

  test('rejects an invalid stage', async () => {
    await expect(
      svc.addPhoto('p1', file, 'invalida', null, { id: 'w1', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(Project.findByPk).not.toHaveBeenCalled();
  });

  test('rejects when no file is provided', async () => {
    await expect(
      svc.addPhoto('p1', null, 'antes', null, { id: 'w1', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects a worker not assigned to the project', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', worker_id: 'other-worker' });

    await expect(
      svc.addPhoto('p1', file, 'antes', null, { id: 'w1', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(uploadProjectPhoto).not.toHaveBeenCalled();
  });

  test('rejects a client trying to upload', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', worker_id: 'w1' });

    await expect(
      svc.addPhoto('p1', file, 'antes', null, { id: 'c1', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(uploadProjectPhoto).not.toHaveBeenCalled();
  });

  test('uploads and creates a photo for the assigned worker', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', worker_id: 'w1' });
    uploadProjectPhoto.mockResolvedValue({ url: 'https://x/foto.jpg', path: 'p1/foto.jpg' });
    const reload = jest.fn().mockResolvedValue({ id: 'photo1' });
    ProjectPhoto.create.mockResolvedValue({ reload });

    const result = await svc.addPhoto('p1', file, 'antes', 'Antes de empezar', { id: 'w1', role: 'trabajador' });

    expect(uploadProjectPhoto).toHaveBeenCalledWith(file, 'p1');
    expect(ProjectPhoto.create).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://x/foto.jpg',
      storage_path: 'p1/foto.jpg',
      stage: 'antes',
      caption: 'Antes de empezar',
      project_id: 'p1',
      uploaded_by: 'w1',
    }));
    expect(result).toEqual({ id: 'photo1' });
  });
});

describe('projectPhotoService.listPhotos', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects a client who does not own the project', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'other-client', worker_id: 'w1' });

    await expect(
      svc.listPhotos('p1', { id: 'c1', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('returns photos for the project owner', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', worker_id: 'w1' });
    ProjectPhoto.findAll.mockResolvedValue([{ id: 'photo1' }]);

    const result = await svc.listPhotos('p1', { id: 'c1', role: 'cliente' });

    expect(result).toEqual([{ id: 'photo1' }]);
  });
});

describe('projectPhotoService.deletePhoto', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects deletion by someone who did not upload it and is not admin', async () => {
    ProjectPhoto.findByPk.mockResolvedValue({ id: 'photo1', uploaded_by: 'w1', storage_path: 'p1/x.jpg', destroy: jest.fn() });

    await expect(
      svc.deletePhoto('photo1', { id: 'other-worker', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(deleteProjectPhotoFile).not.toHaveBeenCalled();
  });

  test('allows the uploader to delete their own photo', async () => {
    const destroy = jest.fn().mockResolvedValue();
    ProjectPhoto.findByPk.mockResolvedValue({ id: 'photo1', uploaded_by: 'w1', storage_path: 'p1/x.jpg', destroy });

    await svc.deletePhoto('photo1', { id: 'w1', role: 'trabajador' });

    expect(deleteProjectPhotoFile).toHaveBeenCalledWith('p1/x.jpg');
    expect(destroy).toHaveBeenCalled();
  });
});
