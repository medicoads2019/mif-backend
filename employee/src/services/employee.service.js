const Employee = require("../models/employee.model");
const cloudinary = require("../config/cloudinary");
const logger = require("../utils/logger");
const bcrypt = require("bcryptjs");
const { Readable } = require("stream");
const {
  generateEmployeeToken,
  verifyToken,
  revokeToken,
  isTokenRevoked,
  generateOtpCode,
} = require("../utils/auth");
const { sendForgotPasswordOtpMail } = require("../utils/mailer");

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_MINUTES = 15;

const streamUpload = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });

const uploadProfilePhoto = async (buffer) => {
  const [original, thumbnail] = await Promise.all([
    streamUpload(buffer, {
      folder: "EmployeeProfileOriginal",
      resource_type: "image",
      use_filename: true,
      unique_filename: true,
    }),
    streamUpload(buffer, {
      folder: "EmployeeProfileThumbnail",
      resource_type: "image",
      transformation: [{ width: 200, height: 200, crop: "fill", quality: 80 }],
    }),
  ]);
  return {
    profilePhotoOriginalUrl: original.secure_url,
    profilePhotoThumbnailUrl: thumbnail.secure_url,
    profilePhotoOriginalPublicId: original.public_id,
    profilePhotoThumbnailPublicId: thumbnail.public_id,
  };
};

const sanitize = (employee) => {
  const obj = employee.toObject ? employee.toObject() : employee;
  delete obj.password;
  delete obj.emailVerificationCode;
  return obj;
};

const findEmployeeByIdentifier = async (identifier) => {
  if (!identifier || typeof identifier !== "string") {
    return null;
  }

  const normalized = identifier.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.includes("@")) {
    return Employee.findOne({
      email: normalized.toLowerCase(),
      softDelete: false,
    });
  }

  return Employee.findOne({
    mobileNumber: normalized,
    softDelete: false,
  });
};

const getRemainingLockMinutes = (lockUntil) => {
  const diffMs = new Date(lockUntil).getTime() - Date.now();
  return Math.max(1, Math.ceil(diffMs / (60 * 1000)));
};

exports.createEmployee = async (data, file) => {
  const { firstName, lastName, mobileNumber, email, password } = data;

  const existingMobile = await Employee.findOne({ mobileNumber });
  if (existingMobile)
    return {
      status: 409,
      body: { success: false, message: "Mobile number already registered" },
    };

  const existingEmail = await Employee.findOne({ email: email.toLowerCase() });
  if (existingEmail)
    return {
      status: 409,
      body: { success: false, message: "Email already registered" },
    };

  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  const employee = await Employee.create({
    ...data,
    email: email.toLowerCase(),
    password: hashedPassword,
  });

  if (file) {
    setImmediate(async () => {
      try {
        const uploadResult = await uploadProfilePhoto(file.buffer);
        await Employee.findByIdAndUpdate(employee._id, {
          ...uploadResult,
          $push: { updatedAt: new Date() },
        });
        logger.info(`Profile photo uploaded for employeeId=${employee._id}`);
      } catch (err) {
        logger.error(`Async profile upload failed: ${err.message}`);
      }
    });
    return {
      status: 202,
      body: {
        success: true,
        message: "Employee created; photo uploading",
        data: sanitize(employee),
      },
    };
  }

  return {
    status: 201,
    body: {
      success: true,
      message: "Employee created",
      data: sanitize(employee),
    },
  };
};

exports.login = async ({ identifier, password }) => {
  const employee = await findEmployeeByIdentifier(identifier);

  if (!employee) {
    return {
      status: 401,
      body: { success: false, message: "Invalid credentials" },
    };
  }

  if (!employee.password) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Password is not set for this account",
      },
    };
  }

  if (employee.lockUntil && new Date(employee.lockUntil) > new Date()) {
    return {
      status: 423,
      body: {
        success: false,
        message: `Account is temporarily locked. Try again after ${getRemainingLockMinutes(employee.lockUntil)} minute(s)`,
        lockUntil: employee.lockUntil,
      },
    };
  }

  const isValidPassword = await bcrypt.compare(password, employee.password);

  if (!isValidPassword) {
    const nextAttempts = (employee.failedLoginAttempts || 0) + 1;
    const updatePayload = {
      failedLoginAttempts: nextAttempts,
      $push: { updatedAt: new Date() },
    };

    if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
      updatePayload.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      updatePayload.failedLoginAttempts = MAX_FAILED_ATTEMPTS;
    }

    await Employee.findByIdAndUpdate(employee._id, updatePayload, {
      new: false,
    });

    if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
      return {
        status: 423,
        body: {
          success: false,
          message: "Too many failed attempts. Account locked for 15 minutes",
          lockUntil: updatePayload.lockUntil,
        },
      };
    }

    return {
      status: 401,
      body: {
        success: false,
        message: `Invalid credentials. ${MAX_FAILED_ATTEMPTS - nextAttempts} attempt(s) left`,
      },
    };
  }

  await Employee.findByIdAndUpdate(employee._id, {
    failedLoginAttempts: 0,
    lockUntil: null,
    lastActiveDate: new Date(),
    $push: { updatedAt: new Date() },
  });

  const token = generateEmployeeToken(employee);

  return {
    status: 200,
    body: {
      success: true,
      message: "Login successful",
      token,
      data: sanitize(employee),
    },
  };
};

exports.forgotPassword = async ({ email }) => {
  const normalizedEmail = (email || "").trim().toLowerCase();

  const employee = await Employee.findOne({
    email: normalizedEmail,
    softDelete: false,
  });

  if (!employee) {
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  }

  const otpCode = generateOtpCode(6);

  await Employee.findByIdAndUpdate(employee._id, {
    emailVerificationCode: otpCode,
    $push: { updatedAt: new Date() },
  });

  try {
    await sendForgotPasswordOtpMail({
      to: employee.email,
      name: employee.firstName,
      otpCode,
    });
  } catch (err) {
    logger.error(`MAIL_ERROR | forgotPassword | ${err.message}`);

    const detail =
      process.env.NODE_ENV !== "production" ? ` (${err.message})` : "";

    return {
      status: 500,
      body: {
        success: false,
        message: `Failed to send OTP email. Configure SMTP and try again${detail}`,
      },
    };
  }

  const body = {
    success: true,
    message: "OTP sent to registered email",
  };

  if (process.env.NODE_ENV !== "production") {
    body.devOtp = otpCode;
  }

  return { status: 200, body };
};

exports.resetPassword = async ({
  email,
  otpCode,
  newPassword,
  confirmPassword,
}) => {
  if (newPassword !== confirmPassword) {
    return {
      status: 400,
      body: {
        success: false,
        message: "New password and confirm password do not match",
      },
    };
  }

  if (!newPassword || newPassword.length < 6) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Password must be at least 6 characters",
      },
    };
  }

  const normalizedEmail = (email || "").trim().toLowerCase();
  const normalizedOtpCode = (otpCode || "").trim().toUpperCase();

  const employee = await Employee.findOne({
    email: normalizedEmail,
    softDelete: false,
  });

  if (!employee) {
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  }

  if (!employee.emailVerificationCode) {
    return {
      status: 400,
      body: { success: false, message: "No OTP requested for this account" },
    };
  }

  if (
    (employee.emailVerificationCode || "").toUpperCase() !== normalizedOtpCode
  ) {
    return {
      status: 400,
      body: { success: false, message: "Invalid OTP code" },
    };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await Employee.findByIdAndUpdate(employee._id, {
    password: hashedPassword,
    emailVerificationCode: null,
    failedLoginAttempts: 0,
    lockUntil: null,
    $push: { updatedAt: new Date() },
  });

  return {
    status: 200,
    body: { success: true, message: "Password reset successful" },
  };
};

exports.changePassword = async ({
  identifier,
  oldPassword,
  newPassword,
  confirmPassword,
}) => {
  if (newPassword !== confirmPassword) {
    return {
      status: 400,
      body: {
        success: false,
        message: "New password and confirm password do not match",
      },
    };
  }

  if (!newPassword || newPassword.length < 6) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Password must be at least 6 characters",
      },
    };
  }

  const employee = await findEmployeeByIdentifier(identifier);

  if (!employee) {
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  }

  if (!employee.password) {
    return {
      status: 400,
      body: { success: false, message: "Password is not set for this account" },
    };
  }

  const oldPasswordMatched = await bcrypt.compare(
    oldPassword,
    employee.password,
  );

  if (!oldPasswordMatched) {
    return {
      status: 401,
      body: { success: false, message: "Old password is incorrect" },
    };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await Employee.findByIdAndUpdate(employee._id, {
    password: hashedPassword,
    $push: { updatedAt: new Date() },
  });

  return {
    status: 200,
    body: { success: true, message: "Password changed successfully" },
  };
};

exports.adminUnlockEmployee = async (employeeId) => {
  const employee = await Employee.findByIdAndUpdate(
    employeeId,
    {
      failedLoginAttempts: 0,
      lockUntil: null,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");

  if (!employee) {
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      message: "Employee unlocked by admin",
      data: employee,
    },
  };
};

exports.logout = async ({ token }) => {
  if (!token) {
    return {
      status: 400,
      body: { success: false, message: "Token is required" },
    };
  }

  if (isTokenRevoked(token)) {
    return {
      status: 200,
      body: { success: true, message: "Logout successful" },
    };
  }

  try {
    const decoded = verifyToken(token);
    revokeToken(token, decoded);

    return {
      status: 200,
      body: { success: true, message: "Logout successful" },
    };
  } catch (err) {
    return {
      status: 401,
      body: { success: false, message: "Invalid or expired token" },
    };
  }
};

exports.getAllEmployees = async () => {
  const employees = await Employee.find({ softDelete: false }).select(
    "-password -emailVerificationCode",
  );
  return { status: 200, body: { success: true, data: employees } };
};

exports.getById = async (employeeId) => {
  const employee = await Employee.findById(employeeId).select(
    "-password -emailVerificationCode",
  );
  if (!employee)
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  return { status: 200, body: { success: true, data: employee } };
};

exports.getByMobile = async (mobileNumber) => {
  const employee = await Employee.findOne({ mobileNumber }).select(
    "-password -emailVerificationCode",
  );
  if (!employee)
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  return { status: 200, body: { success: true, data: employee } };
};

exports.getByEmail = async (email) => {
  const employee = await Employee.findOne({
    email: email.toLowerCase(),
  }).select("-password -emailVerificationCode");
  if (!employee)
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  return { status: 200, body: { success: true, data: employee } };
};

exports.getByStatus = async (status) => {
  const employees = await Employee.find({
    userStatus: status,
    softDelete: false,
  }).select("-password -emailVerificationCode");
  return { status: 200, body: { success: true, data: employees } };
};

exports.getByUserType = async (userType) => {
  const employees = await Employee.find({ userType, softDelete: false }).select(
    "-password -emailVerificationCode",
  );
  return { status: 200, body: { success: true, data: employees } };
};

exports.getBySoftDelete = async (value) => {
  const employees = await Employee.find({ softDelete: value }).select(
    "-password -emailVerificationCode",
  );
  return { status: 200, body: { success: true, data: employees } };
};

exports.updateProfilePhoto = async (employeeId, file) => {
  const employee = await Employee.findById(employeeId);
  if (!employee)
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };

  setImmediate(async () => {
    try {
      if (employee.profilePhotoOriginalPublicId) {
        await Promise.all([
          cloudinary.uploader.destroy(employee.profilePhotoOriginalPublicId),
          cloudinary.uploader.destroy(employee.profilePhotoThumbnailPublicId),
        ]);
      }
      const uploadResult = await uploadProfilePhoto(file.buffer);
      await Employee.findByIdAndUpdate(employeeId, {
        ...uploadResult,
        $push: { updatedAt: new Date() },
      });
      logger.info(`Profile photo updated for employeeId=${employeeId}`);
    } catch (err) {
      logger.error(`Async profile update failed: ${err.message}`);
    }
  });

  return {
    status: 202,
    body: { success: true, message: "Profile photo update in progress" },
  };
};

exports.updatePersonalInfo = async (employeeId, data) => {
  const employee = await Employee.findByIdAndUpdate(
    employeeId,
    { ...data, $push: { updatedAt: new Date() } },
    { new: true },
  ).select("-password -emailVerificationCode");
  if (!employee)
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "Personal info updated", data: employee },
  };
};

exports.updatePassword = async (employeeId, password) => {
  const hashed = await bcrypt.hash(password, 10);
  const employee = await Employee.findByIdAndUpdate(
    employeeId,
    { password: hashed, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!employee)
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  return { status: 200, body: { success: true, message: "Password updated" } };
};

exports.updateStatus = async (employeeId, status) => {
  const employee = await Employee.findById(employeeId);
  if (!employee)
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  const updated = await Employee.findByIdAndUpdate(
    employeeId,
    {
      previousStatus: employee.userStatus,
      userStatus: status,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");
  return {
    status: 200,
    body: { success: true, message: "Status updated", data: updated },
  };
};

exports.updateUserType = async (employeeId, userType) => {
  const employee = await Employee.findByIdAndUpdate(
    employeeId,
    { userType, $push: { updatedAt: new Date() } },
    { new: true },
  ).select("-password -emailVerificationCode");
  if (!employee)
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "User type updated", data: employee },
  };
};

exports.verifyMobileOtp = async (employeeId) => {
  const employee = await Employee.findByIdAndUpdate(
    employeeId,
    { mobileOtpVerified: true, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!employee)
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "Mobile OTP verified" },
  };
};

exports.verifyEmailOtp = async (employeeId) => {
  const employee = await Employee.findByIdAndUpdate(
    employeeId,
    {
      emailOtpVerified: true,
      emailVerificationCode: null,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );
  if (!employee)
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "Email OTP verified" },
  };
};

exports.softDelete = async (employeeId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee)
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  const updated = await Employee.findByIdAndUpdate(
    employeeId,
    {
      softDelete: true,
      previousStatus: employee.userStatus,
      userStatus: "BLOCKED",
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");
  return {
    status: 200,
    body: { success: true, message: "Employee soft-deleted", data: updated },
  };
};

exports.restore = async (employeeId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee)
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  const updated = await Employee.findByIdAndUpdate(
    employeeId,
    {
      softDelete: false,
      userStatus: employee.previousStatus || "PENDING",
      previousStatus: null,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");
  return {
    status: 200,
    body: { success: true, message: "Employee restored", data: updated },
  };
};

exports.hardDelete = async (employeeId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee)
    return {
      status: 404,
      body: { success: false, message: "Employee not found" },
    };
  if (employee.profilePhotoOriginalPublicId) {
    await Promise.all([
      cloudinary.uploader.destroy(employee.profilePhotoOriginalPublicId),
      cloudinary.uploader.destroy(employee.profilePhotoThumbnailPublicId),
    ]);
  }
  await Employee.findByIdAndDelete(employeeId);
  return {
    status: 200,
    body: { success: true, message: "Employee permanently deleted" },
  };
};
