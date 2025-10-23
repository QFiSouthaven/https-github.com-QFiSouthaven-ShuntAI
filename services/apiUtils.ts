// services/apiUtils.ts

export class ApiServiceError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiServiceError';
    // This is necessary for correctly extending built-in classes like Error in some environments
    Object.setPrototypeOf(this, ApiServiceError.prototype);
  }
}

/**
 * A utility to handle API errors in a standardized way.
 * It can process Response objects, ApiServiceError instances, or generic Errors.
 * @param error The error object to handle.
 * @returns A user-friendly error message string.
 */
export const handleApiError = (error: any): string => {
  if (error instanceof Response) {
    switch (error.status) {
      case 401:
        return 'Authentication failed. Please check your credentials.';
      case 429:
        return 'Too Many Requests. Please wait a moment and try again.';
      case 500:
        return 'Internal Server Error. The server encountered a problem.';
      default:
        return `An unexpected network error occurred (Status: ${error.status}).`;
    }
  }

  if (error instanceof ApiServiceError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }
  
  // Fallback for non-Error objects or unknown types
  return 'An unexpected error occurred. Please try again.';
};
