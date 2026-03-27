"use strict";

const dotenv = require("dotenv");
const path = require("path");

dotenv.config();
dotenv.config({
  path: path.join(__dirname, "client", ".env"),
  override: false,
});
dotenv.config({
  path: path.join(__dirname, "employee", ".env"),
  override: false,
});

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

global.mongoose = mongoose;

const festivalRouter = require("./festival/src/routes/festival.routes");
const festivalImageRouter = require("./festivalImage/src/routes/image.routes");
const bannerRouter = require("./banner/src/routes/banner.routes");
const demoFrameRouter = require("./demoframe/src/routes/demoFrame.routes");
const categoryRouter = require("./category/src/routes/category.routes");
const categoryImageRouter = require("./categoryImage/src/routes/image.routes");
const businessRouter = require("./business/src/routes/business.routes");
const businessImageRouter = require("./businessImage/src/routes/image.routes");
const businessFrameRouter = require("./businessFrame/src/routes/businessFrame.routes");
const businessFrameImageRouter = require("./businessFrameImage/src/routes/image.routes");
const clientFrameRouter = require("./clientFrame/src/routes/clientFrame.routes");
const clientFrameImageRouter = require("./clientFrameImage/src/routes/image.routes");
const clientRouter = require("./client/src/routes/client.routes");
const employeeRouter = require("./employee/src/routes/employee.routes");
const imageDownloadRouter = require("./imageDownload/src/routes/imageDownload.routes");
const restrictionRouter = require("./restrictions/src/routes/restriction.routes");
const contactRouter = require("./contact/src/routes/contact.routes");
const appContentRouter = require("./appContent/src/routes/appContent.routes");

const isVercel = process.env.VERCEL === "1";
const shouldWriteFileLogs =
  process.env.DISABLE_FILE_LOGS !== "true" && !isVercel;
const logDir =
  process.env.LOG_DIR || path.join(isVercel ? "/tmp" : process.cwd(), "logs");

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.printf(
    ({ timestamp, level, message }) =>
      `${timestamp} [${level.toUpperCase().padEnd(5)}] [app:backend] ${message}`,
  ),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    ({ timestamp, level, message }) =>
      `${timestamp} ${level.toUpperCase().padEnd(5)} ${message}`,
  ),
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

let dbConnectPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (dbConnectPromise) {
    return dbConnectPromise;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  try {
    dbConnectPromise = mongoose.connect(process.env.MONGO_URI);
    await dbConnectPromise;
    logger.info("MongoDB connected successfully");
    return mongoose.connection;
  } catch (error) {
    dbConnectPromise = null;
    logger.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
}

const app = express();
const PORT = process.env.PORT || 8058;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim());
}

if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (
        process.env.NODE_ENV !== "production" &&
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS: origin not allowed"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    logger.error(`DB middleware failed: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
  });
});

app.use("/festivals", festivalRouter);
app.use("/festivalimages", festivalImageRouter);
app.use("/banners", bannerRouter);
app.use("/demoFrames", demoFrameRouter);
app.use("/categorys", categoryRouter);
app.use("/categoryimages", categoryImageRouter);
app.use("/businesss", businessRouter);
app.use("/businessimages", businessImageRouter);
app.use("/business-frames", businessFrameRouter);
app.use("/business-frame-images", businessFrameImageRouter);
app.use("/client-frames", clientFrameRouter);
app.use("/client-frame-images", clientFrameImageRouter);
app.use("/clients", clientRouter);
app.use("/employees", employeeRouter);
app.use("/image-download", imageDownloadRouter);
app.use("/restrictions", restrictionRouter);
app.use("/contact-us", contactRouter);
app.use("/app-content", appContentRouter);

if (!isVercel && require.main === module) {
  app.listen(PORT, () => {
    logger.info(`[app:backend] Backend server running on port ${PORT}`);
    logger.info("[app:backend] Festival routes           -> /festivals");
    logger.info("[app:backend] FestivalImage routes      -> /festivalimages");
    logger.info("[app:backend] Banner routes             -> /banners");
    logger.info("[app:backend] DemoFrame routes          -> /demoFrames");
    logger.info("[app:backend] Category routes           -> /categorys");
    logger.info("[app:backend] CategoryImage routes      -> /categoryimages");
    logger.info("[app:backend] Business routes           -> /businesss");
    logger.info("[app:backend] BusinessImage routes      -> /businessimages");
    logger.info("[app:backend] BusinessFrame routes      -> /business-frames");
    logger.info(
      "[app:backend] BusinessFrameImage routes -> /business-frame-images",
    );
    logger.info("[app:backend] ClientFrame routes        -> /client-frames");
    logger.info(
      "[app:backend] ClientFrameImage routes   -> /client-frame-images",
    );
    logger.info("[app:backend] Client routes             -> /clients");
    logger.info("[app:backend] Employee routes           -> /employees");
    logger.info("[app:backend] ImageDownload routes      -> /image-download");
    logger.info("[app:backend] Restriction routes        -> /restrictions");
    logger.info("[app:backend] Contact Us routes         -> /contact-us");
    logger.info("[app:backend] App Content routes        -> /app-content");
  });
}

module.exports = app;
