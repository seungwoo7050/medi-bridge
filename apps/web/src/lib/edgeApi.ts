import { SeedComparisonRepository } from '@medi-bridge/db/seed';
import {
  BoundsComparisonRequestSchema,
  BoundsComparisonResponseSchema,
  MatchHospitalQuerySchema,
  MatchHospitalResponseSchema,
} from '@medi-bridge/shared';

const seedRepo = new SeedComparisonRepository();

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function edgeJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

export function handleOptionsEdge(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function handleMatchEdge(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return handleOptionsEdge();
  }

  let parsedInput:
    | {
        readonly success: true;
        readonly data: ReturnType<typeof MatchHospitalQuerySchema.parse>;
      }
    | {
        readonly success: false;
        readonly issues: unknown;
      };

  if (request.method === 'GET') {
    const sp = new URL(request.url).searchParams;
    const res = MatchHospitalQuerySchema.safeParse({
      name: sp.get('name') ?? '',
      regionHint: sp.get('regionHint') ?? '',
      department: sp.get('department') ?? '',
      ykiho: sp.get('ykiho') ?? undefined,
      includeVat: sp.get('includeVat') !== 'false',
    });
    if (!res.success) {
      return edgeJson({ error: 'INVALID_QUERY', issues: res.error.issues }, 400);
    }
    parsedInput = { success: true, data: res.data };
  } else if (request.method === 'POST') {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return edgeJson({ error: 'INVALID_JSON' }, 400);
    }
    const res = MatchHospitalQuerySchema.safeParse(body);
    if (!res.success) {
      return edgeJson({ error: 'INVALID_BODY', issues: res.error.issues }, 400);
    }
    parsedInput = { success: true, data: res.data };
  } else {
    return edgeJson({ error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const hospital = await seedRepo.matchHospital(parsedInput.data);
  const payload = MatchHospitalResponseSchema.parse({
    matched: hospital !== null,
    includeVat: parsedInput.data.includeVat,
    hospital,
  });
  return edgeJson(payload);
}

export async function handleBoundsEdge(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return handleOptionsEdge();
  }
  if (request.method !== 'POST') {
    return edgeJson({ error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return edgeJson({ error: 'INVALID_JSON' }, 400);
  }

  const parsed = BoundsComparisonRequestSchema.safeParse(body);
  if (!parsed.success) {
    return edgeJson({ error: 'INVALID_BODY', issues: parsed.error.issues }, 400);
  }

  const items = await seedRepo.compareBounds(parsed.data);
  const payload = BoundsComparisonResponseSchema.parse({
    includeVat: parsed.data.includeVat,
    sortBy: parsed.data.sortBy,
    matchedCount: items.length,
    items,
  });
  return edgeJson(payload);
}

export async function handleTreatmentsEdge(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return handleOptionsEdge();
  }
  if (request.method !== 'GET') {
    return edgeJson({ error: 'METHOD_NOT_ALLOWED' }, 405);
  }
  const includeVat = new URL(request.url).searchParams.get('includeVat') !== 'false';
  const treatments = await seedRepo.getTreatmentCatalogStats(includeVat);
  return edgeJson({ includeVat, treatments });
}
