const multer = require("multer");
const service = require("../services/client.service");
const logger = require("../utils/logger");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const VALID_STATUSES = ["PENDING", "ACTIVE", "BLOCKED", "SUSPENDED"];
const VALID_USER_TYPES = ["DEMO", "PREMIUM", "GUEST"];

exports.uploadSingle = upload.single("profilePhoto");

exports.createClient = async (req, res) => {
  const { firstName, lastName, mobileNumber, email } = req.body;
  if (!firstName || !lastName)
    return res
      .status(400)
      .json({ success: false, message: "firstName and lastName are required" });
  if (!mobileNumber)
    return res
      .status(400)
      .json({ success: false, message: "mobileNumber is required" });
  if (!email)
    return res
      .status(400)
      .json({ success: false, message: "email is required" });
  try {
    const result = await service.createClient(req.body, req.file || null);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | createClient | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getClientStats = async (req, res) => {
  try {
    const { createdBy } = req.query;
    const result = await service.getClientStats(createdBy);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getVerificationStats = async (req, res) => {
  try {
    const result = await service.getVerificationStats();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getAllClients = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const result = await service.getAllClients(page, limit);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.searchClients = async (req, res) => {
  const { type, q } = req.query;
  if (!type || !q) {
    return res
      .status(400)
      .json({ success: false, message: "type and q query params are required" });
  }
  try {
    const result = await service.searchClients(type, q);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await service.getById(req.params.clientId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByMobile = async (req, res) => {
  try {
    const result = await service.getByMobile(req.params.mobileNumber);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByEmail = async (req, res) => {
  const email = req.query.email || req.params.email;
  if (!email)
    return res
      .status(400)
      .json({ success: false, message: "email is required" });
  try {
    const result = await service.getByEmail(email);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByStatus = async (req, res) => {
  const upper = req.params.status ? req.params.status.toUpperCase() : "";
  if (!VALID_STATUSES.includes(upper))
    return res.status(400).json({ success: false, message: "Invalid status" });
  try {
    const result = await service.getByStatus(upper);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByUserType = async (req, res) => {
  const upper = req.params.userType ? req.params.userType.toUpperCase() : "";
  if (!VALID_USER_TYPES.includes(upper))
    return res
      .status(400)
      .json({ success: false, message: "Invalid user type" });
  try {
    const result = await service.getByUserType(upper);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getBySoftDelete = async (req, res) => {
  const boolVal =
    req.params.value === "true"
      ? true
      : req.params.value === "false"
        ? false
        : null;
  if (boolVal === null)
    return res
      .status(400)
      .json({ success: false, message: "Value must be true or false" });
  try {
    const result = await service.getBySoftDelete(boolVal);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateProfilePhoto = async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ success: false, message: "File is required" });
  try {
    const result = await service.updateProfilePhoto(
      req.params.clientId,
      req.file,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updatePersonalInfo = async (req, res) => {
  const allowed = [
    "firstName",
    "middleName",
    "lastName",
    "dateOfBirth",
    "gender",
    "alternateMobileNumber",
    "socialMediaLinks",
    "createdBy",
    "uploadedBy",
    "mobileOtpVerified",
    "emailOtpVerified",
  ];
  const data = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  try {
    const result = await service.updatePersonalInfo(req.params.clientId, data);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateBusinessInfo = async (req, res) => {
  const allowed = [
    "businessName",
    "businessCategory",
    "designation",
    "websiteUrl",
    "businessContactNumber",
    "businessWhatsappNumber",
    "businessAddress",
  ];
  const data = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  try {
    const result = await service.updateBusinessInfo(req.params.clientId, data);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updatePassword = async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  try {
    const result = await service.updatePassword(req.params.clientId, password);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateStatus = async (req, res) => {
  const upper = req.params.status ? req.params.status.toUpperCase() : "";
  if (!VALID_STATUSES.includes(upper))
    return res.status(400).json({ success: false, message: "Invalid status" });
  try {
    const result = await service.updateStatus(req.params.clientId, upper);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateUserType = async (req, res) => {
  const upper = req.params.userType ? req.params.userType.toUpperCase() : "";
  if (!VALID_USER_TYPES.includes(upper))
    return res
      .status(400)
      .json({ success: false, message: "Invalid user type" });
  try {
    const result = await service.updateUserType(req.params.clientId, upper);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateSubscription = async (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.planId)
    return res
      .status(400)
      .json({ success: false, message: "Subscription planId is required" });
  try {
    const result = await service.updateSubscription(
      req.params.clientId,
      subscription,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.addBusinessFrameId = async (req, res) => {
  const { businessFrameId } = req.body;
  if (!businessFrameId)
    return res
      .status(400)
      .json({ success: false, message: "businessFrameId is required" });
  try {
    const result = await service.addBusinessFrameId(
      req.params.clientId,
      businessFrameId,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.setBusinessFrameIds = async (req, res) => {
  const { imageIds } = req.body;
  if (!Array.isArray(imageIds))
    return res
      .status(400)
      .json({ success: false, message: "imageIds must be an array" });
  try {
    const result = await service.setBusinessFrameIds(
      req.params.clientId,
      imageIds,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.addClientFrameId = async (req, res) => {
  const { clientFrameId } = req.body;
  if (!clientFrameId)
    return res
      .status(400)
      .json({ success: false, message: "clientFrameId is required" });
  try {
    const result = await service.addClientFrameId(
      req.params.clientId,
      clientFrameId,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.setClientFrameIds = async (req, res) => {
  const { imageIds } = req.body;
  if (!Array.isArray(imageIds))
    return res
      .status(400)
      .json({ success: false, message: "imageIds must be an array" });
  try {
    const result = await service.setClientFrameIds(
      req.params.clientId,
      imageIds,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.removeBusinessFrameImageId = async (req, res) => {
  const { imageId } = req.params;
  if (!imageId)
    return res
      .status(400)
      .json({ success: false, message: "imageId is required" });
  try {
    const result = await service.removeBusinessFrameImageId(
      req.params.clientId,
      imageId,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.removeClientFrameImageId = async (req, res) => {
  const { imageId } = req.params;
  if (!imageId)
    return res
      .status(400)
      .json({ success: false, message: "imageId is required" });
  try {
    const result = await service.removeClientFrameImageId(
      req.params.clientId,
      imageId,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateSelectedFrame = async (req, res) => {
  const { selectedFrameId } = req.body;
  if (!selectedFrameId)
    return res
      .status(400)
      .json({ success: false, message: "selectedFrameId is required" });
  try {
    const result = await service.updateSelectedFrame(
      req.params.clientId,
      selectedFrameId,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.verifyMobileOtp = async (req, res) => {
  try {
    const result = await service.verifyMobileOtp(req.params.clientId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  const { otpCode } = req.body;
  try {
    const result = await service.verifyEmailOtp(req.params.clientId, otpCode);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.sendEmailOtp = async (req, res) => {
  try {
    const result = await service.sendEmailOtp(req.params.clientId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.softDelete = async (req, res) => {
  try {
    const result = await service.softDelete(req.params.clientId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.restore = async (req, res) => {
  try {
    const result = await service.restore(req.params.clientId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const result = await service.hardDelete(req.params.clientId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.incrementDownloadCount = async (req, res) => {
  try {
    const result = await service.incrementDownloadCount(req.params.clientId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      message: "identifier (email or mobileNumber) and password are required",
    });
  }

  try {
    const result = await service.login({ identifier, password });
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | login | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "email is required" });
  }

  try {
    const result = await service.forgotPassword({ email });
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | forgotPassword | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.setReferralCode = async (req, res) => {
  const { referralCode } = req.body;
  if (!referralCode || !referralCode.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "referralCode is required" });
  }
  try {
    const result = await service.setReferralCode(
      req.params.clientId,
      referralCode.trim(),
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | setReferralCode | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otpCode, newPassword, confirmPassword } = req.body;

  if (!email || !otpCode || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "email, otpCode, newPassword and confirmPassword are required",
    });
  }

  try {
    const result = await service.resetPassword({
      email,
      otpCode,
      newPassword,
      confirmPassword,
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | resetPassword | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.changePassword = async (req, res) => {
  const { identifier, oldPassword, newPassword, confirmPassword } = req.body;

  if (!identifier || !oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message:
        "identifier, oldPassword, newPassword and confirmPassword are required",
    });
  }

  try {
    const result = await service.changePassword({
      identifier,
      oldPassword,
      newPassword,
      confirmPassword,
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | changePassword | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.adminUnlockClient = async (req, res) => {
  try {
    const result = await service.adminUnlockClient(req.params.clientId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | adminUnlockClient | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.logout = async (req, res) => {
  const authorizationHeader = req.headers.authorization;
  const bodyToken = req.body && req.body.token ? req.body.token : null;

  let token = null;
  if (authorizationHeader && authorizationHeader.startsWith("Bearer ")) {
    token = authorizationHeader.slice(7).trim();
  } else {
    token = bodyToken;
  }

  try {
    const result = await service.logout({ token });
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | logout | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
