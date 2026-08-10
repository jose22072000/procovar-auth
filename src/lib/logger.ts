import winston from "winston";
import "winston-daily-rotate-file";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";
const isServer = typeof window === "undefined";

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define the format of the log
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.meta ? JSON.stringify(info.meta) : ''}`
  )
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create the logger instance (only on server side to avoid browser errors)
let winstonLogger: winston.Logger | null = null;

if (isServer) {
  const transports: winston.transport[] = [
    // Always write errors to error.log
    new winston.transports.DailyRotateFile({
      filename: path.join(process.cwd(), "logs", "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
      format: jsonFormat,
    }),
    // Write all logs to combined.log
    new winston.transports.DailyRotateFile({
      filename: path.join(process.cwd(), "logs", "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      format: jsonFormat,
    }),
  ];

  // Always log to stdout. In production the only transports used to be rotating
  // files inside the container: ephemeral, lost on every redeploy, and invisible
  // in `docker logs` / Dokploy. That made failures like a rejected QB Notify
  // payload silent, since notifications are fire-and-forget.
  transports.push(
    new winston.transports.Console({
      format: isProduction ? jsonFormat : format,
    })
  );

  winstonLogger = winston.createLogger({
    level: isProduction ? "info" : "debug",
    levels,
    transports,
  });
}

// Wrapper to handle client-side vs server-side
export const logger = {
  info: (message: string, meta?: unknown) => {
    if (isServer && winstonLogger) {
      winstonLogger.info(message, { meta });
    } else if (!isProduction) {
      console.log(message, meta);
    }
  },
  warn: (message: string, meta?: unknown) => {
    if (isServer && winstonLogger) {
      winstonLogger.warn(message, { meta });
    } else if (!isProduction) {
      console.warn(message, meta);
    }
  },
  error: (message: string, meta?: unknown) => {
    if (isServer && winstonLogger) {
      winstonLogger.error(message, { meta });
    } else if (!isProduction) {
      console.error(message, meta);
    }
  },
  debug: (message: string, meta?: unknown) => {
    if (isServer && winstonLogger) {
      winstonLogger.debug(message, { meta });
    } else if (!isProduction) {
      console.debug(message, meta);
    }
  },
};
