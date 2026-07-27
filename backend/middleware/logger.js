import morgan from "morgan";
import config from "../config/index.js";

function loggerMiddleware() {
  if (config.isProd) {
    return morgan("tiny", {
      skip: (_req, res) => res.statusCode < 400,
    });
  }
  return morgan("dev");
}

export default loggerMiddleware;
