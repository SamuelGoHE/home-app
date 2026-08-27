jest.mock('../src/models', () => ({
  Rating: { findAll: jest.fn() },
  User: {},
  Project: {},
  Service: {},
}));

jest.mock('sequelize', () => ({
  Op: { gte: Symbol('gte') },
}));

const ratingService = require('../src/services/ratingService');
const { Rating } = require('../src/models');
const { Op } = require('sequelize');

describe('ratingService.getRecentRatings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('only queries the given reviewer\'s own ratings scored 4 or higher', async () => {
    Rating.findAll.mockResolvedValue([]);

    await ratingService.getRecentRatings('client-1');

    expect(Rating.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reviewer_id: 'client-1', score: { [Op.gte]: 4 } },
      })
    );
  });

  test('orders by most recent first and respects the limit', async () => {
    Rating.findAll.mockResolvedValue([]);

    await ratingService.getRecentRatings('client-1', 3);

    expect(Rating.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        order: [['createdAt', 'DESC']],
        limit: 3,
      })
    );
  });

  test('defaults to a limit of 6 when none is given', async () => {
    Rating.findAll.mockResolvedValue([]);

    await ratingService.getRecentRatings('client-1');

    expect(Rating.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 6 }));
  });

  test('returns whatever Rating.findAll resolves', async () => {
    const ratings = [{ id: 'r1', score: 5 }];
    Rating.findAll.mockResolvedValue(ratings);

    const result = await ratingService.getRecentRatings('client-1');

    expect(result).toBe(ratings);
  });
});
