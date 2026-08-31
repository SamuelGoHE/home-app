jest.mock('../src/models', () => ({
  Task: { findByPk: jest.fn(), count: jest.fn() },
  Project: {},
  User: {},
}));

jest.mock('sequelize', () => ({
  Op: { ne: Symbol('ne') },
}));

const taskService = require('../src/services/taskService');
const { Task } = require('../src/models');

// Construye una tarea mockeada con project incluido. update/reload registran llamadas.
const mockTask = (overrides = {}) => {
  const projectUpdate = jest.fn().mockResolvedValue();
  const update = jest.fn().mockResolvedValue();
  const reload = jest.fn().mockResolvedValue({ id: 't-1', reloaded: true });
  const task = {
    id: 't-1',
    assigned_to: 'w-1',
    project_id: 'p-1',
    project: { update: projectUpdate },
    update,
    reload,
    ...overrides,
  };
  return { task, update, reload, projectUpdate };
};

describe('taskService.updateTaskStatus — permisos', () => {
  beforeEach(() => jest.clearAllMocks());

  test('lanza error si la tarea no existe', async () => {
    Task.findByPk.mockResolvedValue(null);
    await expect(taskService.updateTaskStatus('t-1', { status: 'en_progreso' }, { id: 'w-1', role: 'trabajador' }))
      .rejects.toThrow('Tarea no encontrada');
  });

  test('un trabajador no asignado no puede tocar la tarea', async () => {
    const { task } = mockTask({ assigned_to: 'otro' });
    Task.findByPk.mockResolvedValue(task);
    await expect(taskService.updateTaskStatus('t-1', { status: 'en_progreso' }, { id: 'w-1', role: 'trabajador' }))
      .rejects.toThrow('Sin acceso a esta tarea');
  });

  test('un cliente (ni admin ni trabajador) no puede actualizar tareas', async () => {
    const { task } = mockTask();
    Task.findByPk.mockResolvedValue(task);
    await expect(taskService.updateTaskStatus('t-1', { status: 'en_progreso' }, { id: 'c-1', role: 'cliente' }))
      .rejects.toThrow('Sin acceso a esta tarea');
  });
});

describe('taskService.updateTaskStatus — whitelist de campos del trabajador', () => {
  beforeEach(() => jest.clearAllMocks());

  test('el trabajador solo puede modificar campos permitidos; el resto se descarta', async () => {
    const { task, update } = mockTask();
    Task.findByPk.mockResolvedValue(task);
    Task.count.mockResolvedValue(1); // queda al menos una pendiente → no completa proyecto

    await taskService.updateTaskStatus('t-1', {
      status: 'en_progreso',
      notes: 'avanzando',
      assigned_to: 'hacker',   // no permitido
      budget: 999999,          // no permitido
    }, { id: 'w-1', role: 'trabajador' });

    const persisted = update.mock.calls[0][0];
    expect(persisted).toMatchObject({ status: 'en_progreso', notes: 'avanzando' });
    expect(persisted).not.toHaveProperty('assigned_to');
    expect(persisted).not.toHaveProperty('budget');
  });

  test('un admin puede pasar campos que al trabajador se le filtrarían', async () => {
    const { task, update } = mockTask();
    Task.findByPk.mockResolvedValue(task);
    Task.count.mockResolvedValue(1);

    await taskService.updateTaskStatus('t-1', { status: 'en_progreso', assigned_to: 'w-2' }, { id: 'a-1', role: 'admin' });

    expect(update.mock.calls[0][0]).toMatchObject({ assigned_to: 'w-2' });
  });
});

describe('taskService.updateTaskStatus — completado y auto-cierre del proyecto', () => {
  beforeEach(() => jest.clearAllMocks());

  test('marcar la tarea como completada fija completed_at', async () => {
    const { task, update } = mockTask();
    Task.findByPk.mockResolvedValue(task);
    Task.count.mockResolvedValue(1);

    await taskService.updateTaskStatus('t-1', { status: 'completada' }, { id: 'w-1', role: 'trabajador' });

    expect(update.mock.calls[0][0].completed_at).toBeInstanceOf(Date);
  });

  test('cierra el proyecto cuando no quedan tareas pendientes', async () => {
    const { task, projectUpdate } = mockTask();
    Task.findByPk.mockResolvedValue(task);
    Task.count.mockResolvedValue(0); // ninguna pendiente

    await taskService.updateTaskStatus('t-1', { status: 'completada' }, { id: 'w-1', role: 'trabajador' });

    expect(projectUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'completado' }));
  });

  test('NO cierra el proyecto si aún quedan tareas pendientes', async () => {
    const { task, projectUpdate } = mockTask();
    Task.findByPk.mockResolvedValue(task);
    Task.count.mockResolvedValue(2);

    await taskService.updateTaskStatus('t-1', { status: 'completada' }, { id: 'w-1', role: 'trabajador' });

    expect(projectUpdate).not.toHaveBeenCalled();
  });
});
