export function validate(schemaFn) {
  return (req, _res, next) => {
    const result = schemaFn(req.body);
    if (!result.success) {
      const err = new Error("Validation failed");
      err.name = "ZodError";
      err.issues = result.error.issues;
      err.statusCode = 422;
      return next(err);
    }
    req.validBody = result.data;
    next();
  };
}

export function validateQuery(schemaFn) {
  return (req, _res, next) => {
    const result = schemaFn(req.query);
    if (!result.success) {
      const err = new Error("Invalid query parameters");
      err.name = "ZodError";
      err.issues = result.error.issues;
      err.statusCode = 400;
      return next(err);
    }
    req.validQuery = result.data;
    next();
  };
}

export function validateParams(paramName, validatorFn) {
  return (req, _res, next) => {
    if (validatorFn && typeof validatorFn === "function") {
      const ok = validatorFn(req.params?.[paramName]);
      if (!ok) {
        const err = new Error(`Invalid ${paramName}`);
        err.statusCode = 400;
        err.code = "BAD_PARAM";
        return next(err);
      }
    }
    next();
  };
}

export default {
  validate,
  validateQuery,
  validateParams,
};
