import { NextResponse } from 'next/server';
import { AppError, ErrorCode, ErrorDetail } from './errors';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
  };
}

export function ok<T>(data: T, headers?: HeadersInit): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data }, { status: 200, headers });
}

export function created<T>(data: T, headers?: HeadersInit): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data }, { status: 201, headers });
}

export function paginated<T>(
  data: T[],
  meta: PaginationMeta,
  headers?: HeadersInit
): NextResponse<ApiSuccessResponse<T[]>> {
  return NextResponse.json({ data, meta }, { status: 200, headers });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(
  error: AppError | { code: ErrorCode; message: string; details?: ErrorDetail[]; statusCode?: number }
): NextResponse<ApiErrorResponse> {
  const status = error instanceof AppError ? error.statusCode : error.statusCode || 500;
  const body: ApiErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && error.details.length > 0 ? { details: error.details } : {}),
    },
  };
  return NextResponse.json(body, { status });
}
