// Utilidad de paginación reutilizable para los listados del backend.
//
// Convención de respuesta (retrocompatible): el envelope mantiene `data`
// como el array de items y añade un campo hermano `pagination` con la metadata.
// Los consumidores que solo leen `res.data.data` siguen funcionando (reciben
// la primera página); quien quiera paginar lee `res.data.pagination`.

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Parsea `page` y `pageSize` desde el query string, con valores por defecto y
 * límites seguros. Devuelve además `limit`/`offset` listos para Sequelize.
 *
 * @param {object} query  req.query
 * @param {object} [opts] { defaultPageSize, maxPageSize }
 * @returns {{ page:number, pageSize:number, limit:number, offset:number }}
 */
const parsePagination = (query = {}, opts = {}) => {
  const defaultPageSize = opts.defaultPageSize || DEFAULT_PAGE_SIZE;
  const maxPageSize = opts.maxPageSize || MAX_PAGE_SIZE;

  let page = parseInt(query.page, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  let pageSize = parseInt(query.pageSize, 10);
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = defaultPageSize;
  if (pageSize > maxPageSize) pageSize = maxPageSize;

  return { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize };
};

/**
 * Construye la metadata de paginación a partir del total de filas.
 *
 * @param {{ total:number, page:number, pageSize:number }} params
 * @returns {{ page, pageSize, total, totalPages, hasNext, hasPrev }}
 */
const buildMeta = ({ total, page, pageSize }) => {
  const safeTotal = Number.isFinite(total) ? total : 0;
  const totalPages = pageSize > 0 ? Math.ceil(safeTotal / pageSize) : 0;
  return {
    page,
    pageSize,
    total: safeTotal,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

module.exports = { parsePagination, buildMeta, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
