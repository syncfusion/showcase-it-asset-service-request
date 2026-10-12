import { useMemo } from 'react';
import requestsFixture from '../../data/requests.json';
import type { Request, RequestsFixture } from '../../types/requests';

/**
 * Keys the dashboard's SLA-at-risk hook validates against the
 * `requests.json` fixture. The fixture is the same one the Requests
 * page consumes, so we only need the `requests` array; the lookup
 * tables (`columnOptions`, `ownerOptions`, …) are not needed for
 * the at-risk slice but are still verified to exist so a typo in
 * the JSON's top-level shape surfaces immediately.
 */
const REQUIRED_KEYS: (keyof RequestsFixture)[] = [
  'requests',
  'columnOptions',
  'priorityOptions',
  'slaOptions',
  'ownerOptions',
];

function assertFixtureShape(fixture: unknown): fixture is RequestsFixture {
  if (!fixture || typeof fixture !== 'object') {
    console.error(
      '[useSlaAtRiskRequests] requests fixture is missing or not an object',
    );
    return false;
  }
  const missing = REQUIRED_KEYS.filter((k) => !(k in (fixture as object)));
  if (missing.length > 0) {
    console.error(
      '[useSlaAtRiskRequests] requests.json is missing required keys:',
      missing,
    );
    return false;
  }
  return true;
}

/**
 * Parses the SLA `text` field into a normalized "minutes remaining"
 * number so we can sort at-risk rows by urgency. The fixture uses
 * a small fixed vocabulary for at-risk chips:
 *
 *   - `45m`, `1h 10m`, `1h 40m`, `1h 45m`, `2h 05m`, `2h 10m`,
 *     `3h 20m`, `3h 50m`, `4h 30m`, `5h 12m`
 *
 * Anything we can't parse falls back to `Number.POSITIVE_INFINITY`
 * so it sorts to the bottom of the at-risk list rather than the top.
 */
function parseSlaMinutes(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return Number.POSITIVE_INFINITY;

  // Match `Nh Mm` first (e.g. "1h 40m", "2h 05m")
  const hourMinMatch = trimmed.match(/^(\d+)\s*h\s*(\d+)?\s*m?$/i);
  if (hourMinMatch) {
    const hours = Number(hourMinMatch[1]) || 0;
    const minutes = Number(hourMinMatch[2]) || 0;
    return hours * 60 + minutes;
  }

  // Match bare `Nm` (e.g. "45m")
  const minMatch = trimmed.match(/^(\d+)\s*m$/i);
  if (minMatch) {
    return Number(minMatch[1]) || 0;
  }

  // Match `Nd` (e.g. "1d") — used for safe chips, included for completeness.
  const dayMatch = trimmed.match(/^(\d+)\s*d$/i);
  if (dayMatch) {
    return Number(dayMatch[1]) * 24 * 60;
  }

  return Number.POSITIVE_INFINITY;
}

export interface UseSlaAtRiskRequestsResult {
  /** The at-risk rows, sorted by remaining SLA time ascending. */
  rows: Request[];
  /** The at-risk row count. */
  total: number;
  /** The refresh counter the page read at. */
  refreshKey: number;
}

/**
 * Reads `src/data/requests.json`, narrows the shape, and returns
 * the SLA-at-risk slice the dashboard's grid renders. The
 * `refreshKey` parameter is a stability counter — bumping it
 * forces the memo to re-evaluate so the dashboard's "Refresh"
 * button drives the grid's re-derivation (and the grid's pager
 * resets via a separate `key` prop).
 */
export function useSlaAtRiskRequests(
  refreshKey: number = 0,
  maxRows: number = Number.POSITIVE_INFINITY,
): UseSlaAtRiskRequestsResult {
  return useMemo<UseSlaAtRiskRequestsResult>(() => {
    assertFixtureShape(requestsFixture);

    const fixture = requestsFixture as unknown as RequestsFixture;
    const rows = fixture.requests
      .filter((r) => r.sla && r.sla.kind === 'risk')
      .slice()
      .sort(
        (a, b) =>
          parseSlaMinutes(a.sla.text) - parseSlaMinutes(b.sla.text),
      )
      .slice(0, maxRows);

    return {
      rows,
      total: rows.length,
      refreshKey,
    };
  }, [refreshKey]);
}

export default useSlaAtRiskRequests;
