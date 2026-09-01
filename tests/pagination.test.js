const { parsePagination, buildMeta, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../src/utils/pagination');

describe('parsePagination', () => {
  test('usa valores por defecto cuando el query está vacío', () => {
    expect(parsePagination({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    });
  });

  test('calcula offset a partir de page y pageSize', () => {
    expect(parsePagination({ page: '3', pageSize: '10' })).toEqual({
      page: 3,
      pageSize: 10,
      limit: 10,
      offset: 20,
    });
  });

  test('normaliza page inválido o menor a 1 → 1', () => {
    expect(parsePagination({ page: '0' }).page).toBe(1);
    expect(parsePagination({ page: '-5' }).page).toBe(1);
    expect(parsePagination({ page: 'abc' }).page).toBe(1);
  });

  test('pageSize inválido o menor a 1 cae al default', () => {
    expect(parsePagination({ pageSize: '0' }).pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePagination({ pageSize: 'xyz' }).pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  test('pageSize se limita al máximo permitido', () => {
    expect(parsePagination({ pageSize: '9999' }).pageSize).toBe(MAX_PAGE_SIZE);
  });

  test('respeta overrides de defaultPageSize y maxPageSize', () => {
    const r = parsePagination({ pageSize: '500' }, { defaultPageSize: 5, maxPageSize: 50 });
    expect(r.pageSize).toBe(50);
    expect(parsePagination({}, { defaultPageSize: 5 }).pageSize).toBe(5);
  });
});

describe('buildMeta', () => {
  test('calcula totalPages redondeando hacia arriba', () => {
    expect(buildMeta({ total: 42, page: 1, pageSize: 20 })).toEqual({
      page: 1,
      pageSize: 20,
      total: 42,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });
  });

  test('página del medio: hasNext y hasPrev en true', () => {
    const m = buildMeta({ total: 42, page: 2, pageSize: 20 });
    expect(m.hasNext).toBe(true);
    expect(m.hasPrev).toBe(true);
  });

  test('última página: hasNext false', () => {
    const m = buildMeta({ total: 42, page: 3, pageSize: 20 });
    expect(m.hasNext).toBe(false);
    expect(m.hasPrev).toBe(true);
  });

  test('total 0 → totalPages 0 y sin páginas siguientes', () => {
    expect(buildMeta({ total: 0, page: 1, pageSize: 20 })).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
  });

  test('total undefined (mock sin count) se trata como 0', () => {
    expect(buildMeta({ total: undefined, page: 1, pageSize: 20 }).total).toBe(0);
  });
});
