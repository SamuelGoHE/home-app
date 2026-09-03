// Smoke tests del armado del payload de "crear cotización" (POST /quotes).
import { buildQuotePayload } from '../src/utils/quote';

const base = {
  serviceId: 's1',
  workerId: 'w1',
  city: 'Medellín',
  address: 'Cra 1 # 2-3',
  occupied: false,
  notes: 'Timbre dañado',
  startDate: new Date(2026, 8, 10), // 10-sep-2026 (mes 0-based)
};

describe('buildQuotePayload', () => {
  test('mapea los campos y formatea start_date como yyyy-MM-dd', () => {
    const p = buildQuotePayload({ ...base, sq_meters: '', rangeMode: false });
    expect(p).toMatchObject({
      service_id: 's1',
      worker_id: 'w1',
      city: 'Medellín',
      address: 'Cra 1 # 2-3',
      occupied: false,
      notes: 'Timbre dañado',
      start_date: '2026-09-10',
    });
  });

  test('sq_meters vacío → null; con valor → número', () => {
    expect(buildQuotePayload({ ...base, sq_meters: '', rangeMode: false }).sq_meters).toBeNull();
    expect(buildQuotePayload({ ...base, sq_meters: '42.5', rangeMode: false }).sq_meters).toBe(42.5);
  });

  test('sin modalidad por día: no envía end_date (queda undefined)', () => {
    const p = buildQuotePayload({ ...base, sq_meters: '', rangeMode: false, endDate: new Date(2026, 8, 15) });
    expect(p.end_date).toBeUndefined();
  });

  test('modalidad por día con rango: envía end_date formateada', () => {
    const p = buildQuotePayload({ ...base, sq_meters: '', rangeMode: true, endDate: new Date(2026, 8, 15) });
    expect(p.end_date).toBe('2026-09-15');
  });

  test('modalidad por día sin fecha final: end_date undefined', () => {
    const p = buildQuotePayload({ ...base, sq_meters: '', rangeMode: true, endDate: null });
    expect(p.end_date).toBeUndefined();
  });
});
