const Client = require("../models/client.model");
const DemoFrame = require("../../../demoframe/src/models/demoFrame.model");
const cloudinary = require("../config/cloudinary");
const logger = require("../utils/logger");
const bcrypt = require("bcryptjs");
const { Readable } = require("stream");
const {
  generateClientToken,
  verifyToken,
  revokeToken,
  isTokenRevoked,
  generateOtpCode,
} = require("../utils/auth");
const {
  sendForgotPasswordOtpMail,
  sendEmailVerificationOtpMail,
} = require("../utils/mailer");

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
      folder: "ClientProfileOriginal",
      resource_type: "image",
      use_filename: true,
      unique_filename: true,
    }),
    streamUpload(buffer, {
      folder: "ClientProfileThumbnail",
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

// Generates and emails a registration OTP to a newly created client.
// Returns { devOtp } in non-production for debugging; silently logs on mail failure.
const sendRegistrationEmailOtp = async (client) => {
  const otpCode = generateOtpCode(6);
  await Client.findByIdAndUpdate(client._id, {
    emailVerificationCode: otpCode,
    $push: { updatedAt: new Date() },
  });
  try {
    await sendEmailVerificationOtpMail({
      to: client.email,
      name: client.firstName,
      otpCode,
    });
  } catch (err) {
    logger.error(`MAIL_ERROR | sendRegistrationEmailOtp | ${err.message}`);
  }
  if (process.env.NODE_ENV !== "production") {
    return { devOtp: otpCode };
  }
  return {};
};

exports.createClient = async (data, file) => {
  const { firstName, lastName, mobileNumber, email, password } = data;

  const existingMobile = await Client.findOne({ mobileNumber });
  if (existingMobile)
    return {
      status: 409,
      body: { success: false, message: "Mobile number already registered" },
    };

  const existingEmail = await Client.findOne({ email: email.toLowerCase() });
  if (existingEmail)
    return {
      status: 409,
      body: { success: false, message: "Email already registered" },
    };

  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  // Auto-assign selectedFrameId from the first published DemoFrame
  const firstDemoFrame = await DemoFrame.findOne({
    demoFrameStatus: "APPROVED",
    softDelete: false,
  })
    .sort({ orderIndex: 1 })
    .catch(() => null);

  const client = await Client.create({
    ...data,
    email: email.toLowerCase(),
    password: hashedPassword,
    selectedFrameId: firstDemoFrame ? firstDemoFrame._id.toString() : undefined,
  });

  if (file) {
    setImmediate(async () => {
      try {
        const uploadResult = await uploadProfilePhoto(file.buffer);
        await Client.findByIdAndUpdate(client._id, {
          ...uploadResult,
          $push: { updatedAt: new Date() },
        });
        logger.info(`Profile photo uploaded for clientId=${client._id}`);
      } catch (err) {
        logger.error(`Async profile upload failed: ${err.message}`);
      }
    });

    const response = {
      status: 202,
      body: {
        success: true,
        message: "Client created; photo uploading",
        data: sanitize(client),
      },
    };

    if (data.createdBy === "SELF") {
      const otpResult = await sendRegistrationEmailOtp(client);
      if (otpResult.devOtp) response.body.devOtp = otpResult.devOtp;
    }

    return response;
  }

  const response = {
    status: 201,
    body: { success: true, message: "Client created", data: sanitize(client) },
  };

  if (data.createdBy === "SELF") {
    const otpResult = await sendRegistrationEmailOtp(client);
    if (otpResult.devOtp) response.body.devOtp = otpResult.devOtp;
  }

  return response;
};

const sanitize = (client) => {
  const obj = client.toObject ? client.toObject() : client;
  delete obj.password;
  delete obj.emailVerificationCode;
  return obj;
};

const findClientByIdentifier = async (identifier) => {
  if (!identifier || typeof identifier !== "string") {
    return null;
  }

  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier) {
    return null;
  }

  if (normalizedIdentifier.includes("@")) {
    return Client.findOne({
      email: normalizedIdentifier.toLowerCase(),
      softDelete: false,
    });
  }

  return Client.findOne({
    mobileNumber: normalizedIdentifier,
    softDelete: false,
  });
};

const getRemainingLockMinutes = (lockUntil) => {
  const diffMs = new Date(lockUntil).getTime() - Date.now();
  return Math.max(1, Math.ceil(diffMs / (60 * 1000)));
};

exports.login = async ({ identifier, password }) => {
  const client = await findClientByIdentifier(identifier);

  if (!client) {
    return {
      status: 401,
      body: { success: false, message: "Invalid credentials" },
    };
  }

  if (client.lockUntil && new Date(client.lockUntil) > new Date()) {
    return {
      status: 423,
      body: {
        success: false,
        message: `Account is temporarily locked. Try again after ${getRemainingLockMinutes(client.lockUntil)} minute(s)`,
        lockUntil: client.lockUntil,
      },
    };
  }

  if (!client.password) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Password is not set for this account",
      },
    };
  }

  const isValidPassword = await bcrypt.compare(password, client.password);

  if (!isValidPassword) {
    const nextAttempts = (client.failedLoginAttempts || 0) + 1;
    const updatePayload = {
      failedLoginAttempts: nextAttempts,
      $push: { updatedAt: new Date() },
    };

    if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
      updatePayload.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      updatePayload.failedLoginAttempts = MAX_FAILED_ATTEMPTS;
    }

    await Client.findByIdAndUpdate(client._id, updatePayload, { new: false });

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

  await Client.findByIdAndUpdate(client._id, {
    failedLoginAttempts: 0,
    lockUntil: null,
    lastActiveDate: new Date(),
    $push: { updatedAt: new Date() },
  });

  const token = generateClientToken(client);

  return {
    status: 200,
    body: {
      success: true,
      message: "Login successful",
      token,
      data: sanitize(client),
    },
  };
};

exports.forgotPassword = async ({ email }) => {
  const normalizedEmail = (email || "").trim().toLowerCase();

  const client = await Client.findOne({
    email: normalizedEmail,
    softDelete: false,
  });

  if (!client) {
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  }

  const otpCode = generateOtpCode(6);

  await Client.findByIdAndUpdate(client._id, {
    emailVerificationCode: otpCode,
    $push: { updatedAt: new Date() },
  });

  try {
    await sendForgotPasswordOtpMail({
      to: client.email,
      name: client.firstName,
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

  const client = await Client.findOne({
    email: normalizedEmail,
    softDelete: false,
  });

  if (!client) {
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  }

  if (!client.emailVerificationCode) {
    return {
      status: 400,
      body: { success: false, message: "No OTP requested for this account" },
    };
  }

  if (
    (client.emailVerificationCode || "").toUpperCase() !== normalizedOtpCode
  ) {
    return {
      status: 400,
      body: { success: false, message: "Invalid OTP code" },
    };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await Client.findByIdAndUpdate(client._id, {
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

  const client = await findClientByIdentifier(identifier);

  if (!client) {
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  }

  if (!client.password) {
    return {
      status: 400,
      body: { success: false, message: "Password is not set for this account" },
    };
  }

  const oldPasswordMatched = await bcrypt.compare(oldPassword, client.password);

  if (!oldPasswordMatched) {
    return {
      status: 401,
      body: { success: false, message: "Old password is incorrect" },
    };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await Client.findByIdAndUpdate(client._id, {
    password: hashedPassword,
    $push: { updatedAt: new Date() },
  });

  return {
    status: 200,
    body: { success: true, message: "Password changed successfully" },
  };
};

exports.adminUnlockClient = async (clientId) => {
  const client = await Client.findByIdAndUpdate(
    clientId,
    {
      failedLoginAttempts: 0,
      lockUntil: null,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");

  if (!client) {
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  }

  return {
    status: 200,
    body: { success: true, message: "Client unlocked by admin", data: client },
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

exports.getAllClients = async () => {
  const clients = await Client.find({ softDelete: false }).select(
    "-password -emailVerificationCode",
  );
  return { status: 200, body: { success: true, data: clients } };
};

exports.getById = async (clientId) => {
  const client = await Client.findById(clientId).select(
    "-password -emailVerificationCode",
  );
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return { status: 200, body: { success: true, data: client } };
};

exports.getByMobile = async (mobileNumber) => {
  const client = await Client.findOne({ mobileNumber }).select(
    "-password -emailVerificationCode",
  );
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return { status: 200, body: { success: true, data: client } };
};

exports.getByEmail = async (email) => {
  const client = await Client.findOne({ email: email.toLowerCase() }).select(
    "-password -emailVerificationCode",
  );
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return { status: 200, body: { success: true, data: client } };
};

exports.getByStatus = async (status) => {
  const clients = await Client.find({
    clientStatus: status,
    softDelete: false,
  }).select("-password -emailVerificationCode");
  return { status: 200, body: { success: true, data: clients } };
};

exports.getByUserType = async (userType) => {
  const clients = await Client.find({ userType, softDelete: false }).select(
    "-password -emailVerificationCode",
  );
  return { status: 200, body: { success: true, data: clients } };
};

exports.getBySoftDelete = async (value) => {
  const clients = await Client.find({ softDelete: value }).select(
    "-password -emailVerificationCode",
  );
  return { status: 200, body: { success: true, data: clients } };
};

exports.updateProfilePhoto = async (clientId, file) => {
  const client = await Client.findById(clientId);
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };

  setImmediate(async () => {
    try {
      if (client.profilePhotoOriginalPublicId) {
        await Promise.all([
          cloudinary.uploader.destroy(client.profilePhotoOriginalPublicId),
          cloudinary.uploader.destroy(client.profilePhotoThumbnailPublicId),
        ]);
      }
      const uploadResult = await uploadProfilePhoto(file.buffer);
      await Client.findByIdAndUpdate(clientId, {
        ...uploadResult,
        $push: { updatedAt: new Date() },
      });
      logger.info(`Profile photo updated for clientId=${clientId}`);
    } catch (err) {
      logger.error(`Async profile update failed: ${err.message}`);
    }
  });

  return {
    status: 202,
    body: { success: true, message: "Profile photo update in progress" },
  };
};

exports.updatePersonalInfo = async (clientId, data) => {
  const client = await Client.findByIdAndUpdate(
    clientId,
    { ...data, $push: { updatedAt: new Date() } },
    { new: true },
  ).select("-password -emailVerificationCode");
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "Personal info updated", data: client },
  };
};

exports.updateBusinessInfo = async (clientId, data) => {
  const client = await Client.findByIdAndUpdate(
    clientId,
    { ...data, $push: { updatedAt: new Date() } },
    { new: true },
  ).select("-password -emailVerificationCode");
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "Business info updated", data: client },
  };
};

exports.updatePassword = async (clientId, password) => {
  const hashed = await bcrypt.hash(password, 10);
  const client = await Client.findByIdAndUpdate(
    clientId,
    { password: hashed, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return { status: 200, body: { success: true, message: "Password updated" } };
};

exports.updateStatus = async (clientId, status) => {
  const client = await Client.findById(clientId);
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  const updated = await Client.findByIdAndUpdate(
    clientId,
    {
      previousStatus: client.clientStatus,
      clientStatus: status,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");
  return {
    status: 200,
    body: { success: true, message: "Status updated", data: updated },
  };
};

exports.updateUserType = async (clientId, userType) => {
  // Determine the appropriate selectedFrameId for the new userType
  let selectedFrameId;

  if (userType === "DEMO") {
    // DEMO → use first published DemoFrame
    const firstDemoFrame = await DemoFrame.findOne({
      demoFrameStatus: "APPROVED",
      softDelete: false,
    })
      .sort({ orderIndex: 1 })
      .catch(() => null);
    if (firstDemoFrame) selectedFrameId = firstDemoFrame._id.toString();
  } else {
    // PREMIUM / GUEST → prefer businessFrameIds[0], then clientFrameIds[0], else first DemoFrame
    const current = await Client.findById(clientId).catch(() => null);
    if (current) {
      if (current.businessFrameIds?.length > 0) {
        selectedFrameId = current.businessFrameIds[0];
      } else if (current.clientFrameIds?.length > 0) {
        selectedFrameId = current.clientFrameIds[0];
      } else {
        const firstDemoFrame = await DemoFrame.findOne({
          demoFrameStatus: "APPROVED",
          softDelete: false,
        })
          .sort({ orderIndex: 1 })
          .catch(() => null);
        if (firstDemoFrame) selectedFrameId = firstDemoFrame._id.toString();
      }
    }
  }

  const updateOps = { userType, $push: { updatedAt: new Date() } };
  if (selectedFrameId) updateOps.selectedFrameId = selectedFrameId;

  const client = await Client.findByIdAndUpdate(clientId, updateOps, {
    new: true,
  }).select("-password -emailVerificationCode");
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "User type updated", data: client },
  };
};

exports.updateSubscription = async (clientId, subscription) => {
  const client = await Client.findById(clientId);
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };

  const updateOps = {
    currentSubscription: subscription,
    $push: { updatedAt: new Date() },
  };

  if (client.currentSubscription) {
    updateOps.$push.subscriptionHistory = client.currentSubscription;
  }

  const updated = await Client.findByIdAndUpdate(clientId, updateOps, {
    new: true,
  }).select("-password -emailVerificationCode");
  return {
    status: 200,
    body: { success: true, message: "Subscription updated", data: updated },
  };
};

exports.addBusinessFrameId = async (clientId, businessFrameId) => {
  const client = await Client.findByIdAndUpdate(
    clientId,
    {
      $addToSet: { businessFrameIds: businessFrameId },
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "BusinessFrame added", data: client },
  };
};

exports.setBusinessFrameIds = async (clientId, imageIds) => {
  const client = await Client.findByIdAndUpdate(
    clientId,
    {
      businessFrameIds: imageIds,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "BusinessFrame IDs set", data: client },
  };
};

exports.addClientFrameId = async (clientId, clientFrameId) => {
  const client = await Client.findByIdAndUpdate(
    clientId,
    {
      $addToSet: { clientFrameIds: clientFrameId },
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "ClientFrame added", data: client },
  };
};

exports.setClientFrameIds = async (clientId, imageIds) => {
  const client = await Client.findByIdAndUpdate(
    clientId,
    {
      clientFrameIds: imageIds,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "ClientFrame IDs set", data: client },
  };
};

exports.removeBusinessFrameImageId = async (clientId, imageId) => {
  const client = await Client.findByIdAndUpdate(
    clientId,
    {
      $pull: { businessFrameIds: imageId },
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "Business frame image ID removed from client",
      data: client,
    },
  };
};

exports.removeClientFrameImageId = async (clientId, imageId) => {
  const client = await Client.findByIdAndUpdate(
    clientId,
    {
      $pull: { clientFrameIds: imageId },
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "Client frame image ID removed from client",
      data: client,
    },
  };
};

exports.updateSelectedFrame = async (clientId, selectedFrameId) => {
  const client = await Client.findByIdAndUpdate(
    clientId,
    { selectedFrameId, $push: { updatedAt: new Date() } },
    { new: true },
  ).select("-password -emailVerificationCode");
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "Selected frame updated", data: client },
  };
};

exports.setReferralCode = async (clientId, referralCode) => {
  const client = await Client.findById(clientId);
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };

  if (client.referralCode) {
    return {
      status: 400,
      body: { success: false, message: "Referral code has already been set" },
    };
  }

  const updated = await Client.findByIdAndUpdate(
    clientId,
    { referralCode, $push: { updatedAt: new Date() } },
    { new: true },
  ).select("-password -emailVerificationCode");

  return {
    status: 200,
    body: { success: true, message: "Referral code saved", data: updated },
  };
};

exports.verifyMobileOtp = async (clientId) => {
  const client = await Client.findByIdAndUpdate(
    clientId,
    { mobileOtpVerified: true, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "Mobile OTP verified" },
  };
};

exports.sendEmailOtp = async (clientId) => {
  const client = await Client.findById(clientId).select(
    "-password -emailVerificationCode",
  );
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  if (client.emailOtpVerified)
    return {
      status: 400,
      body: { success: false, message: "Email is already verified" },
    };
  const result = await sendRegistrationEmailOtp(client);
  return {
    status: 200,
    body: {
      success: true,
      message: "OTP sent to your email address",
      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
    },
  };
};

exports.verifyEmailOtp = async (clientId, otpCode) => {
  const client = await Client.findById(clientId);
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };

  // If an OTP code is stored, validate it; otherwise fall through (legacy support)
  if (client.emailVerificationCode) {
    const normalized = (otpCode || "").trim().toUpperCase();
    if (normalized !== client.emailVerificationCode.toUpperCase()) {
      return {
        status: 400,
        body: { success: false, message: "Invalid or expired OTP" },
      };
    }
  }

  await Client.findByIdAndUpdate(
    clientId,
    {
      emailOtpVerified: true,
      emailVerificationCode: null,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );
  return {
    status: 200,
    body: { success: true, message: "Email OTP verified" },
  };
};

exports.softDelete = async (clientId) => {
  const client = await Client.findById(clientId);
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  const updated = await Client.findByIdAndUpdate(
    clientId,
    {
      softDelete: true,
      previousStatus: client.clientStatus,
      clientStatus: "BLOCKED",
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");
  return {
    status: 200,
    body: { success: true, message: "Client soft-deleted", data: updated },
  };
};

exports.restore = async (clientId) => {
  const client = await Client.findById(clientId);
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  const updated = await Client.findByIdAndUpdate(
    clientId,
    {
      softDelete: false,
      clientStatus: client.previousStatus || "PENDING",
      previousStatus: null,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  ).select("-password -emailVerificationCode");
  return {
    status: 200,
    body: { success: true, message: "Client restored", data: updated },
  };
};

exports.hardDelete = async (clientId) => {
  const client = await Client.findById(clientId);
  if (!client)
    return {
      status: 404,
      body: { success: false, message: "Client not found" },
    };
  if (client.profilePhotoOriginalPublicId) {
    await Promise.all([
      cloudinary.uploader.destroy(client.profilePhotoOriginalPublicId),
      cloudinary.uploader.destroy(client.profilePhotoThumbnailPublicId),
    ]);
  }
  await Client.findByIdAndDelete(clientId);
  return {
    status: 200,
    body: { success: true, message: "Client permanently deleted" },
  };
};
