import { format } from 'date-fns';

/**
 * Arma el cuerpo de la solicitud POST /quotes a partir de los datos del
 * formulario de agenda. Extraído de CalendarScreen para poder probar la
 * transformación (fechas, m², rango opcional) sin renderizar la pantalla.
 *
 * - `sq_meters` llega como texto del input → número o null.
 * - `end_date` solo se envía en modalidad por día con rango completo; si no,
 *   queda `undefined` para que axios lo omita del JSON.
 */
export function buildQuotePayload({
  serviceId, workerId, city, address, sq_meters, occupied, notes,
  startDate, endDate, rangeMode,
}) {
  return {
    service_id: serviceId,
    worker_id: workerId,
    city,
    address,
    sq_meters: sq_meters ? parseFloat(sq_meters) : null,
    occupied,
    notes,
    start_date: format(startDate, 'yyyy-MM-dd'),
    end_date: rangeMode && endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
  };
}
