export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super(500, "CONFIG_ERROR", message);
  }
}
export class NotFoundError extends AppError {
  constructor(what = "Resource") {
    super(404, "NOT_FOUND", `${what} was not found.`);
  }
}
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}
export class DatabaseError extends AppError {
  constructor(message: string) {
    super(500, "DATABASE_ERROR", message);
  }
}

/** Errors from the AI layer. `retryable` tells the Gemini client whether another attempt makes sense. */
export class AiError extends AppError {
  constructor(status: number, code: string, message: string, public readonly retryable = false) {
    super(status, code, message);
  }
}
export class AiRateLimitError extends AiError {
  constructor() {
    super(429, "AI_RATE_LIMITED", "The AI service is rate limited right now. Wait a minute and try again.", true);
  }
}
export class AiUnavailableError extends AiError {
  constructor(message = "The AI service is temporarily unavailable. Try again shortly.", retryable = true) {
    super(503, "AI_UNAVAILABLE", message, retryable);
  }
}
export class AiResponseError extends AiError {
  constructor(message = "The AI returned an unusable response. Try again.") {
    super(502, "AI_BAD_RESPONSE", message, true);
  }
}
