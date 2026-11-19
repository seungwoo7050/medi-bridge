import { createComparisonRepository } from '@medi-bridge/db';
import { NextResponse } from 'next/server';

export const comparisonRepo = createComparisonRepository();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function jsonWithCors<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, {
    status,
    headers: CORS_HEADERS,
  });
}

export function optionsCors(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
