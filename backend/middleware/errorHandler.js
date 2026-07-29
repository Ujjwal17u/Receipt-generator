import config from "../config/index.js";

export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export function notFoundHandler(req, _res, next) {
  next(
    new AppError(`Cannot ${req.method} ${req.originalUrl} — endpoint not found`, 404, "NOT_FOUND"),
  );
}

export function errorHandlerMiddleware(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message =
    err.isOperational || config.isDev
      ? err.message || "Something went wrong"
      : "Internal server error";

  const body = {
    success: false,
    message,
    code,
    ...(config.isDev && err.stack ? { stack: err.stack.split("\n").slice(0, 8) } : {}),
  };

  if (err.name === "ValidationError") {
    body.code = "VALIDATION_ERROR";
    body.message = err.message || "Validation failed";
    body.errors = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  if (err.name === "ZodError") {
    body.code = "VALIDATION_ERROR";
    body.message = "Validation failed";
    body.errors = err.issues?.map((i) => ({
      field: (i.path || []).join("."),
      message: i.message,
      code: i.code,
    }));
  }

  if (err.code === 11000 || (err.name === "MongoServerError" && err.code === 11000)) {
    const key = Object.keys(err.keyValue || {})[0] || "value";
    const val = err.keyValue ? err.keyValue[key] : "";
    body.code = "DUPLICATE_KEY";
    body.message = `Duplicate ${key}${val ? `: ${val}` : ""} already exists`;
  }

  if (err.name === "CastError") {
    body.code = "BAD_REQUEST";
    body.message = `Invalid ${err.path || "id"} format`;
  }

  res.status(statusCode).json(body);
}

export default {
  AppError,
  notFound: notFoundHandler,
  handler: errorHandlerMiddleware,
};
