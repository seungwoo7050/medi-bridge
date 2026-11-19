import {
  classifyTreatmentName,
  normalizeDepartmentCategory,
  type TreatmentCategory,
} from '@medi-bridge/shared';
import { z } from 'zod';

const HiraBasisItemRawSchema = z.object({
  ykiho: z.string().min(1),
  yadmNm: z.string().min(1),
  clCdNm: z.string().default('의원'),
  sidoCdNm: z.string().min(1),
  sgguCdNm: z.string().min(1),
  addr: z.string().min(1),
  XPos: z.union([z.number(), z.string()]),
  YPos: z.union([z.number(), z.string()]),
  dgsbjtCdNm: z.string().optional(),
});

const HiraBasisResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
    }),
    body: z.object({
      items: z
        .object({
          item: z.union([z.array(HiraBasisItemRawSchema), HiraBasisItemRawSchema]).optional(),
        })
        .optional(),
      totalCount: z.number().optional(),
    }),
  }),
});

const HiraNonPaymentItemRawSchema = z.object({
  ykiho: z.string().min(1),
  npayCd: z.string().min(1),
  npayKorNm: z.string().min(1),
  minPrc: z.union([z.number(), z.string()]),
  maxPrc: z.union([z.number(), z.string()]),
  adtFrDd: z.string().optional(),
});

const HiraNonPaymentResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
    }),
    body: z.object({
      items: z
        .object({
          item: z
            .union([z.array(HiraNonPaymentItemRawSchema), HiraNonPaymentItemRawSchema])
            .optional(),
        })
        .optional(),
    }),
  }),
});

export interface HiraHospitalRecord {
  readonly ykiho: string;
  readonly name: string;
  readonly department: TreatmentCategory;
  readonly sido: string;
  readonly sigungu: string;
  readonly roadAddress: string;
  readonly lat: number;
  readonly lng: number;
}

export interface HiraNonPaymentRecord {
  readonly ykiho: string;
  readonly itemCode: string;
  readonly treatmentCode: string;
  readonly treatmentName: string;
  readonly minPrice: number;
  readonly maxPrice: number;
  readonly reportedDate: string;
}

export type HiraParseResult<T> =
  | { readonly kind: 'parse_error'; readonly reason: string }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'found'; readonly items: readonly T[] };

function toNumber(value: number | string): number | null {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * 건강보험심사평가원 병원정보서비스(getHospBasisList) JSON 응답을 검증·파싱합니다.
 */
export function parseHiraHospitalBasisJson(raw: unknown): HiraParseResult<HiraHospitalRecord> {
  const parsed = HiraBasisResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { kind: 'parse_error', reason: parsed.error.issues[0]?.message ?? 'invalid_schema' };
  }

  if (parsed.data.response.header.resultCode !== '00') {
    return { kind: 'parse_error', reason: `hira_error_${parsed.data.response.header.resultCode}` };
  }

  const rawItem = parsed.data.response.body.items?.item;
  if (!rawItem) {
    return { kind: 'not_found' };
  }

  const list = Array.isArray(rawItem) ? rawItem : [rawItem];
  if (list.length === 0) {
    return { kind: 'not_found' };
  }

  const items: HiraHospitalRecord[] = [];
  for (const row of list) {
    const lng = toNumber(row.XPos);
    const lat = toNumber(row.YPos);
    if (lng === null || lat === null) {
      continue;
    }
    const department = normalizeDepartmentCategory(
      `${row.dgsbjtCdNm ?? ''} ${row.yadmNm} ${row.clCdNm}`,
    );
    items.push({
      ykiho: row.ykiho,
      name: row.yadmNm.trim(),
      department,
      sido: row.sidoCdNm.trim(),
      sigungu: row.sgguCdNm.trim(),
      roadAddress: row.addr.trim(),
      lat,
      lng,
    });
  }

  return items.length > 0 ? { kind: 'found', items } : { kind: 'not_found' };
}

/**
 * 심평원 비급여진료비정보조회서비스(getNonPaymentItemHospDtlList) JSON 응답을 정규화합니다.
 */
export function parseHiraNonPaymentJson(
  raw: unknown,
  categoryHint?: TreatmentCategory,
): HiraParseResult<HiraNonPaymentRecord> {
  const parsed = HiraNonPaymentResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { kind: 'parse_error', reason: parsed.error.issues[0]?.message ?? 'invalid_schema' };
  }

  if (parsed.data.response.header.resultCode !== '00') {
    return { kind: 'parse_error', reason: `hira_error_${parsed.data.response.header.resultCode}` };
  }

  const rawItem = parsed.data.response.body.items?.item;
  if (!rawItem) {
    return { kind: 'not_found' };
  }

  const list = Array.isArray(rawItem) ? rawItem : [rawItem];
  const items: HiraNonPaymentRecord[] = [];

  for (const row of list) {
    const minPrice = toNumber(row.minPrc);
    const maxPrice = toNumber(row.maxPrc);
    if (minPrice === null || maxPrice === null || minPrice < 0) {
      continue;
    }
    const standard = classifyTreatmentName(row.npayKorNm, categoryHint);
    items.push({
      ykiho: row.ykiho,
      itemCode: row.npayCd,
      treatmentCode: standard.code,
      treatmentName: standard.label,
      minPrice: Math.round(minPrice),
      maxPrice: Math.round(maxPrice),
      reportedDate: row.adtFrDd ?? '2026-11-01',
    });
  }

  return items.length > 0 ? { kind: 'found', items } : { kind: 'not_found' };
}
