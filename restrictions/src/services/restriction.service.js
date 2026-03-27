const Restriction = require("../models/restriction.model");

const ALL_USER_TYPES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPER_HR",
  "HR",
  "MARKETING",
  "MODERATOR",
  "USER",
];

const SUPER_ADMIN_PERMISSIONS = {
  dashboard: { view: true },
  festivals: { view: true, create: true, edit: true, delete: true },
  categorys: { view: true, create: true, edit: true, delete: true },
  businesss: { view: true, create: true, edit: true, delete: true },
  banners: { view: true, create: true, edit: true, delete: true },
  demoFrames: { view: true, create: true, edit: true, delete: true },
  businessFrames: { view: true, create: true, edit: true, delete: true },
  clientFrames: { view: true, create: true, edit: true, delete: true },
  clients: { view: true, create: true, edit: true, delete: true },
  employees: { view: true, create: true, edit: true, delete: true },
  contactUs: { view: true, create: true, edit: true, delete: true },
  legalContent: { view: true, create: true, edit: true, delete: true },
  imageDownload: { view: true },
};

const DEFAULT_PERMISSIONS = {
  dashboard: { view: false },
  festivals: { view: false, create: false, edit: false, delete: false },
  categorys: { view: false, create: false, edit: false, delete: false },
  businesss: { view: false, create: false, edit: false, delete: false },
  banners: { view: false, create: false, edit: false, delete: false },
  demoFrames: { view: false, create: false, edit: false, delete: false },
  businessFrames: { view: false, create: false, edit: false, delete: false },
  clientFrames: { view: false, create: false, edit: false, delete: false },
  clients: { view: false, create: false, edit: false, delete: false },
  employees: { view: false, create: false, edit: false, delete: false },
  contactUs: { view: false, create: false, edit: false, delete: false },
  legalContent: { view: false, create: false, edit: false, delete: false },
  imageDownload: { view: false },
};

exports.getAll = async () => {
  const docs = await Restriction.find().lean();

  // Ensure all userTypes exist in the response (fill missing with defaults)
  const map = {};
  for (const doc of docs) {
    map[doc.userType] = doc;
  }

  const result = ALL_USER_TYPES.map((ut) => {
    if (map[ut]) return map[ut];
    return {
      userType: ut,
      permissions:
        ut === "SUPER_ADMIN" ? SUPER_ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS,
    };
  });

  return { status: 200, body: { success: true, data: result } };
};

exports.getByUserType = async (userType) => {
  const upper = (userType || "").toUpperCase();
  if (!ALL_USER_TYPES.includes(upper)) {
    return {
      status: 400,
      body: { success: false, message: "Invalid userType" },
    };
  }

  let doc = await Restriction.findOne({ userType: upper }).lean();
  if (!doc) {
    doc = {
      userType: upper,
      permissions:
        upper === "SUPER_ADMIN" ? SUPER_ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS,
    };
  }
  return { status: 200, body: { success: true, data: doc } };
};

exports.upsert = async (userType, permissions) => {
  const upper = (userType || "").toUpperCase();
  if (!ALL_USER_TYPES.includes(upper)) {
    return {
      status: 400,
      body: { success: false, message: "Invalid userType" },
    };
  }

  // SUPER_ADMIN permissions cannot be changed
  if (upper === "SUPER_ADMIN") {
    return {
      status: 403,
      body: {
        success: false,
        message: "SUPER_ADMIN permissions cannot be modified",
      },
    };
  }

  const doc = await Restriction.findOneAndUpdate(
    { userType: upper },
    { $set: { permissions } },
    { upsert: true, new: true, runValidators: true },
  ).lean();

  return { status: 200, body: { success: true, data: doc } };
};

exports.seedDefaults = async () => {
  const ops = ALL_USER_TYPES.map((ut) => ({
    updateOne: {
      filter: { userType: ut },
      update: {
        $setOnInsert: {
          userType: ut,
          permissions:
            ut === "SUPER_ADMIN"
              ? SUPER_ADMIN_PERMISSIONS
              : DEFAULT_PERMISSIONS,
        },
      },
      upsert: true,
    },
  }));
  await Restriction.bulkWrite(ops);
  return { status: 200, body: { success: true, message: "Defaults seeded" } };
};
