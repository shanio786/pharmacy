import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Centralized error handler. Domain code may throw plain Error objects with
// an attached `status` (and optionally `code`). Anything else becomes a 500.
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;
    const e = err as { status?: number; message?: string; code?: string };
    const status =
      typeof e?.status === "number" && e.status >= 400 && e.status < 600
        ? e.status
        : 500;
    const message =
      typeof e?.message === "string" && e.message
        ? e.message
        : "Internal server error";
    if (status >= 500) {
      logger.error({ err, status }, "request_failed");
    } else {
      logger.warn({ err: { message, code: e?.code }, status }, "request_failed");
    }
    res.status(status).json({ error: message, ...(e?.code ? { code: e.code } : {}) });
  },
);

export default app;
