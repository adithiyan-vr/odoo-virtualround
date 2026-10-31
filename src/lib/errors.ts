export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export interface ErrorDetail {
  field?: string;
  issue: string;
  allowedTransitions?: string[];
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ErrorDetail[];

  constructor(code: ErrorCode, message: string, statusCode: number, details?: ErrorDetail[]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: ErrorDetail[]): AppError {
    return new AppError('VALIDATION_ERROR', message, 400, details);
  }

  static unauthenticated(message = 'Authentication required'): AppError {
    return new AppError('UNAUTHENTICATED', message, 401);
  }

  static forbidden(message = 'You do not have permission to access this resource'): AppError {
    return new AppError('FORBIDDEN', message, 403);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError('NOT_FOUND', message, 404);
  }

  static conflict(message: string, details?: ErrorDetail[]): AppError {
    return new AppError('CONFLICT', message, 409, details);
  }

  static businessRule(message: string, details?: ErrorDetail[]): AppError {
    return new AppError('BUSINESS_RULE', message, 422, details);
  }

  static rateLimited(message = 'Too many requests, please try again later'): AppError {
    return new AppError('RATE_LIMITED', message, 429);
  }

  static internal(message = 'An unexpected internal error occurred'): AppError {
    return new AppError('INTERNAL', message, 500);
  }
}

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  );
}
