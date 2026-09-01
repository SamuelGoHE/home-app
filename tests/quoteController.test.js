// Regresión: quoteController es el que sirve GET /api/quotes/me, /worker y /
// (los handlers de projectController quedaban shadoweados). Cuando projectService
// pasó a findAndCountAll ({ rows, count }), el controller debe seguir enviando
// `data` como ARRAY + `pagination`, no el objeto { rows, count } crudo.
jest.mock('../src/services/projectService', () => ({
  getMyQuotes: jest.fn(),
  getWorkerQuotes: jest.fn(),
  getAllQuotes: jest.fn(),
}));

const projectService = require('../src/services/projectService');
const quoteController = require('../src/controllers/quoteController');

const makeRes = () => {
  const res = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

describe('quoteController — envelope paginado (regresión)', () => {
  beforeEach(() => jest.clearAllMocks());

  const cases = [
    ['getMyQuotes', () => ({ user: { id: 'c-1' }, query: {} })],
    ['getWorkerQuotes', () => ({ user: { id: 'w-1' }, query: {} })],
    ['getAllQuotes', () => ({ user: { id: 'a-1' }, query: {} })],
  ];

  test.each(cases)('%s devuelve data como array + pagination', async (fn, makeReq) => {
    const rows = [{ id: 'q-1' }, { id: 'q-2' }];
    projectService[fn].mockResolvedValue({ rows, count: 2 });
    const res = makeRes();

    await quoteController[fn](makeReq(), res, jest.fn());

    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];
    expect(Array.isArray(payload.data)).toBe(true);      // no { rows, count }
    expect(payload.data).toBe(rows);
    expect(payload.pagination).toMatchObject({ total: 2, page: 1 });
  });

  test('propaga page/pageSize del query a limit/offset del servicio', async () => {
    projectService.getMyQuotes.mockResolvedValue({ rows: [], count: 0 });
    const res = makeRes();

    await quoteController.getMyQuotes({ user: { id: 'c-1' }, query: { page: '3', pageSize: '10' } }, res, jest.fn());

    expect(projectService.getMyQuotes).toHaveBeenCalledWith('c-1', { limit: 10, offset: 20 });
  });
});
