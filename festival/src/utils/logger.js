const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

const isVercel = process.env.VERCEL === "1";
const shouldWriteFileLogs =
  process.env.DISABLE_FILE_LOGS !== "true" && !isVercel;
const logDir =
  process.env.LOG_DIR || path.join(isVercel ? "/tmp" : process.cwd(), "logs");

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase().padEnd(5)}] [app:festival] ${message}`;
  }),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level.toUpperCase().padEnd(5)} ${message}`;
  }),
);

const transports = [new winston.transports.Console({ format: consoleFormat })];

if (shouldWriteFileLogs) {
  transports.push(
    new DailyRotateFile({
      dirname: logDir,
      filename: "application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "1m",
      maxFiles: "7d",
      format: fileFormat,
    }),
  );
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "info",
  transports,
});

module.exports = logger;
