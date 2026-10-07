export class GradeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GradeValidationError';
  }
}

export function validateGradeRange(score: number, fieldName: string): void {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    throw new GradeValidationError(`${fieldName} must be a valid finite number, received: ${score}`);
  }
  if (score < 0 || score > 100) {
    throw new GradeValidationError(`${fieldName} must be between 0 and 100, received: ${score}`);
  }
}
