const multer = require("multer");
const service = require("../services/employee.service");
const logger = require("../utils/logger");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const VALID_STATUSES = ["PENDING", "ACTIVE", "BLOCKED", "SUSPENDED"];
const VALID_USER_TYPES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPER_HR",
  "HR",
  "MARKETING",
  "MODERATOR",
  "USER",
];

exports.uploadSingle = upload.single("profilePhoto");

exports.createEmployee = async (req, res) => {
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
    const result = await service.createEmployee(req.body, req.file || null);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | createEmployee | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const result = await service.getAllEmployees();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await service.getById(req.params.employeeId);
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
      req.params.employeeId,
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
  ];
  const data = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  try {
    const result = await service.updatePersonalInfo(
      req.params.employeeId,
      data,
    );
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
    const result = await service.updatePassword(
      req.params.employeeId,
      password,
    );
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
    const result = await service.updateStatus(req.params.employeeId, upper);
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
    const result = await service.updateUserType(req.params.employeeId, upper);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.verifyMobileOtp = async (req, res) => {
  try {
    const result = await service.verifyMobileOtp(req.params.employeeId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  try {
    const result = await service.verifyEmailOtp(req.params.employeeId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.softDelete = async (req, res) => {
  try {
    const result = await service.softDelete(req.params.employeeId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.restore = async (req, res) => {
  try {
    const result = await service.restore(req.params.employeeId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const result = await service.hardDelete(req.params.employeeId);
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

exports.adminUnlockEmployee = async (req, res) => {
  try {
    const result = await service.adminUnlockEmployee(req.params.employeeId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | adminUnlockEmployee | ${err.message}`);
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
