const admin = require("firebase-admin");
const logger = require("../utils/logger");

let initialized = false;

const parseServiceAccount = () => {
  const fromJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (fromJson) {
    try {
      return JSON.parse(fromJson);
    } catch (error) {
      logger.error(`FCM_CONFIG_ERROR | Invalid FIREBASE_SERVICE_ACCOUNT_JSON | ${error.message}`);
      return null;
    }
  }

  const fromBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!fromBase64) {
    return null;
  }

  try {
    const decoded = Buffer.from(fromBase64, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch (error) {
    logger.error(`FCM_CONFIG_ERROR | Invalid FIREBASE_SERVICE_ACCOUNT_BASE64 | ${error.message}`);
    return null;
  }
};

const initializeFirebase = () => {
  if (initialized) {
    return true;
  }

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    logger.warn(
      "FCM_CONFIG_WARN | Firebase service account is missing. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_BASE64",
    );
    return false;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  initialized = true;
  logger.info("FCM_INIT_SUCCESS | Firebase Admin initialized");
  return true;
};

const getMessaging = () => {
  const ok = initializeFirebase();
  if (!ok) {
    return null;
  }
  return admin.messaging();
};

module.exports = {
  getMessaging,
};
