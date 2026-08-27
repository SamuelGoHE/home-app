jest.mock('../src/models', () => ({
  Project: { findAll: jest.fn(), findByPk: jest.fn() },
  Message: { findAll: jest.fn(), update: jest.fn() },
  User: {},
  Service: {},
}));

jest.mock('sequelize', () => ({
  Op: { in: Symbol('in'), ne: Symbol('ne') },
}));

const svc = require('../src/services/messageService');
const { Project, Message } = require('../src/models');
const { Op } = require('sequelize');

describe('messageService.getConversations', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns an empty list for an admin (no personal inbox)', async () => {
    const result = await svc.getConversations({ id: 'admin-1', role: 'admin' });
    expect(result).toEqual([]);
    expect(Project.findAll).not.toHaveBeenCalled();
  });

  test('skips projects that have no messages yet', async () => {
    Project.findAll.mockResolvedValue([
      { id: 'p1', client_id: 'c1', worker_id: 'w1', title: 'Sin mensajes', worker: { id: 'w1', name: 'Carlos' }, client: { id: 'c1', name: 'Ana' } },
    ]);
    Message.findAll.mockResolvedValue([]);

    const result = await svc.getConversations({ id: 'c1', role: 'cliente' });

    expect(result).toEqual([]);
  });

  test('builds one conversation per project with its last message and unread count', async () => {
    Project.findAll.mockResolvedValue([
      { id: 'p1', client_id: 'c1', worker_id: 'w1', title: 'Enchapes', worker: { id: 'w1', name: 'Carlos' }, client: { id: 'c1', name: 'Ana' }, service: { id: 's1', name: 'Enchapes de Baño' } },
    ]);
    Message.findAll.mockResolvedValue([
      { project_id: 'p1', sender_id: 'w1', text: 'Hola', read: true, createdAt: '2026-08-20T10:00:00Z' },
      { project_id: 'p1', sender_id: 'c1', text: '¿Cómo va?', read: true, createdAt: '2026-08-20T11:00:00Z' },
      { project_id: 'p1', sender_id: 'w1', text: 'Ya casi termino', read: false, createdAt: '2026-08-20T12:00:00Z' },
    ]);

    const result = await svc.getConversations({ id: 'c1', role: 'cliente' });

    expect(result).toEqual([
      expect.objectContaining({
        project_id: 'p1',
        counterpart: { id: 'w1', name: 'Carlos' },
        last_message: expect.objectContaining({ text: 'Ya casi termino', sender_id: 'w1' }),
        unread_count: 1,
      }),
    ]);
  });

  test('sorts conversations by most recent last message first', async () => {
    Project.findAll.mockResolvedValue([
      { id: 'p1', client_id: 'c1', worker_id: 'w1', title: 'Vieja', worker: { id: 'w1' }, client: { id: 'c1' } },
      { id: 'p2', client_id: 'c1', worker_id: 'w2', title: 'Reciente', worker: { id: 'w2' }, client: { id: 'c1' } },
    ]);
    Message.findAll.mockResolvedValue([
      { project_id: 'p1', sender_id: 'w1', text: 'antigua', read: true, createdAt: '2026-08-01T00:00:00Z' },
      { project_id: 'p2', sender_id: 'w2', text: 'nueva', read: true, createdAt: '2026-08-20T00:00:00Z' },
    ]);

    const result = await svc.getConversations({ id: 'c1', role: 'cliente' });

    expect(result.map(c => c.project_id)).toEqual(['p2', 'p1']);
  });
});

describe('messageService.markAsRead', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects a user with no access to the project', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', worker_id: 'w1' });

    await expect(
      svc.markAsRead('p1', { id: 'stranger', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(Message.update).not.toHaveBeenCalled();
  });

  test('marks only the counterpart\'s messages as read', async () => {
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', worker_id: 'w1' });

    await svc.markAsRead('p1', { id: 'c1', role: 'cliente' });

    expect(Message.update).toHaveBeenCalledWith(
      { read: true },
      { where: { project_id: 'p1', sender_id: { [Op.ne]: 'c1' }, read: false } }
    );
  });
});
