const FcmDeviceToken = require("../models/fcmDeviceToken.model");
const FcmSentNotification = require("../models/fcmSentNotification.model");
const { getMessaging } = require("../config/firebaseAdmin");
const logger = require("../utils/logger");

const MAX_MULTICAST_SIZE = 500;

const normalizeString = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizePlatform = (value) => {
  const normalized = normalizeString(value).toLowerCase();
  if (["android", "ios", "web", "windows", "macos", "linux"].includes(normalized)) {
    return normalized;
  }
  return "unknown";
};

const sanitizeDataMap = (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  const output = {};
  Object.entries(data).forEach(([key, value]) => {
    if (!key) return;
    if (value === undefined || value === null) return;
    output[key] = String(value);
  });
  return output;
};

const removeInvalidTokens = async (tokens) => {
  if (!tokens.length) return;
  await FcmDeviceToken.deleteMany({ token: { $in: tokens } });
};

const sendMulticast = async ({ tokens, title, body, data }) => {
  const messaging = getMessaging();
  if (!messaging) {
    return {
      status: 503,
      body: {
        success: false,
        message: "Firebase Cloud Messaging is not configured on backend",
      },
    };
  }

  const chunks = [];
  for (let i = 0; i < tokens.length; i += MAX_MULTICAST_SIZE) {
    chunks.push(tokens.slice(i, i + MAX_MULTICAST_SIZE));
  }

  let successCount = 0;
  let failureCount = 0;
  const invalidTokens = [];

  for (const chunk of chunks) {
    const response = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: "high",
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
      },
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    response.responses.forEach((item, index) => {
      if (item.success) return;

      const code = item.error?.code || "unknown";
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        invalidTokens.push(chunk[index]);
      }
    });
  }

  if (invalidTokens.length) {
    await removeInvalidTokens(invalidTokens);
    logger.info(`FCM_CLEANUP | Removed ${invalidTokens.length} invalid token(s)`);
  }

  return {
    status: 200,
    body: {
      success: true,
      message: "FCM notification dispatched",
      data: {
        requested: tokens.length,
        successCount,
        failureCount,
      },
    },
  };
};

exports.registerDeviceToken = async ({
  clientId,
  token,
  platform,
  appVersion,
  deviceId,
}) => {
  const normalizedClientId = normalizeString(clientId);
  const normalizedToken = normalizeString(token);

  if (!normalizedClientId) {
    return {
      status: 400,
      body: { success: false, message: "clientId is required" },
    };
  }

  if (!normalizedToken) {
    return {
      status: 400,
      body: { success: false, message: "token is required" },
    };
  }

  const record = await FcmDeviceToken.findOneAndUpdate(
    { token: normalizedToken },
    {
      clientId: normalizedClientId,
      token: normalizedToken,
      platform: normalizePlatform(platform),
      appVersion: normalizeString(appVersion) || null,
      deviceId: normalizeString(deviceId) || null,
      isActive: true,
      lastSeenAt: new Date(),
      $push: { updatedAt: new Date() },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return {
    status: 200,
    body: {
      success: true,
      message: "FCM device token registered",
      data: record,
    },
  };
};

exports.unregisterDeviceToken = async ({ token }) => {
  const normalizedToken = normalizeString(token);
  if (!normalizedToken) {
    return {
      status: 400,
      body: { success: false, message: "token is required" },
    };
  }

  const result = await FcmDeviceToken.findOneAndUpdate(
    { token: normalizedToken },
    {
      isActive: false,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );

  if (!result) {
    return {
      status: 200,
      body: { success: true, message: "Token already inactive or not found" },
    };
  }

  return {
    status: 200,
    body: { success: true, message: "FCM device token unregistered" },
  };
};

exports.getStats = async () => {
  const [total, active, uniqueClients] = await Promise.all([
    FcmDeviceToken.countDocuments({}),
    FcmDeviceToken.countDocuments({ isActive: true }),
    FcmDeviceToken.distinct("clientId", { isActive: true }).then((items) => items.length),
  ]);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        totalTokens: total,
        activeTokens: active,
        activeClients: uniqueClients,
      },
    },
  };
};

exports.sendNotification = async ({ title, body, data, clientIds, tokens }) => {
  const normalizedTitle = normalizeString(title);
  const normalizedBody = normalizeString(body);

  if (!normalizedTitle || !normalizedBody) {
    return {
      status: 400,
      body: { success: false, message: "title and body are required" },
    };
  }

  const requestedTokens = Array.isArray(tokens)
    ? tokens.map((item) => normalizeString(item)).filter(Boolean)
    : [];

  const requestedClientIds = Array.isArray(clientIds)
    ? clientIds.map((item) => normalizeString(item)).filter(Boolean)
    : [];

  let targetTokens = requestedTokens;

  if (!targetTokens.length) {
    const query = { isActive: true };
    if (requestedClientIds.length) {
      query.clientId = { $in: requestedClientIds };
    }

    const records = await FcmDeviceToken.find(query).select("token -_id").lean();
    targetTokens = records.map((record) => record.token).filter(Boolean);
  }

  if (!targetTokens.length) {
    return {
      status: 404,
      body: {
        success: false,
        message: "No active FCM tokens found for the requested audience",
      },
    };
  }

  const result = await sendMulticast({
    tokens: targetTokens,
    title: normalizedTitle,
    body: normalizedBody,
    data: sanitizeDataMap(data),
  });

  if (result.status === 200) {
    try {
      await FcmSentNotification.create({
        title: normalizedTitle,
        body: normalizedBody,
        clientIds: requestedClientIds,
        data: sanitizeDataMap(data),
        successCount: result.body?.data?.successCount ?? 0,
        failureCount: result.body?.data?.failureCount ?? 0,
        sentAt: new Date(),
      });
    } catch (err) {
      logger.error("FCM_SAVE_SENT | Failed to persist sent notification:", err);
    }
  }

  return result;
};

const ALLOWED_SORT_FIELDS = new Set(["title", "body", "successCount", "failureCount", "sentAt", "createdAt"]);

exports.getSentNotifications = async ({ page = 1, limit = 20, search = "", sortField = "sentAt", sortOrder = "desc" } = {}) => {
  const skip = (page - 1) * limit;

  const query = {};
  const trimmedSearch = normalizeString(search);
  if (trimmedSearch) {
    query.$or = [
      { title: { $regex: trimmedSearch, $options: "i" } },
      { body: { $regex: trimmedSearch, $options: "i" } },
    ];
  }

  const safeSortField = ALLOWED_SORT_FIELDS.has(sortField) ? sortField : "sentAt";
  const safeSortOrder = sortOrder === "asc" ? 1 : -1;

  const [records, total] = await Promise.all([
    FcmSentNotification.find(query)
      .sort({ [safeSortField]: safeSortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    FcmSentNotification.countDocuments(query),
  ]);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        records,
        total,
        page,
        limit,
      },
    },
  };
};

exports.updateSentNotification = async (id, { title, body, clientIds, data }) => {
  if (!id) {
    return { status: 400, body: { success: false, message: "id is required" } };
  }

  const normalizedTitle = normalizeString(title);
  const normalizedBody = normalizeString(body);

  if (!normalizedTitle || !normalizedBody) {
    return { status: 400, body: { success: false, message: "title and body are required" } };
  }

  const record = await FcmSentNotification.findByIdAndUpdate(
    id,
    {
      title: normalizedTitle,
      body: normalizedBody,
      clientIds: Array.isArray(clientIds)
        ? clientIds.map((c) => normalizeString(c)).filter(Boolean)
        : [],
      data: sanitizeDataMap(data),
    },
    { new: true },
  );

  if (!record) {
    return { status: 404, body: { success: false, message: "Notification not found" } };
  }

  return { status: 200, body: { success: true, data: record } };
};

exports.deleteSentNotification = async (id) => {
  if (!id) {
    return { status: 400, body: { success: false, message: "id is required" } };
  }

  const result = await FcmSentNotification.findByIdAndDelete(id);

  if (!result) {
    return { status: 404, body: { success: false, message: "Notification not found" } };
  }

  return { status: 200, body: { success: true, message: "Notification deleted" } };
};
