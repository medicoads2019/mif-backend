const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET =
  process.env.JWT_SECRET || "myindianfestivals-employee-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const revokedTokens = new Map();

const cleanupRevokedTokens = () => {
  const now = Date.now();
  for (const [token, expiresAt] of revokedTokens.entries()) {
    if (expiresAt <= now) {
      revokedTokens.delete(token);
    }
  }
};

const getExpiryTimestamp = (decodedPayload) => {
  if (!decodedPayload || !decodedPayload.exp) {
    return Date.now() + 7 * 24 * 60 * 60 * 1000;
  }
  return decodedPayload.exp * 1000;
};

exports.generateEmployeeToken = (employee) => {
  const payload = {
    sub: employee._id.toString(),
    employeeId: employee._id.toString(),
    email: employee.email,
    mobileNumber: employee.mobileNumber,
    userType: employee.userType,
    jti: crypto.randomUUID(),
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

exports.verifyToken = (token) => jwt.verify(token, JWT_SECRET);

exports.revokeToken = (token, decodedPayload) => {
  cleanupRevokedTokens();
  revokedTokens.set(token, getExpiryTimestamp(decodedPayload));
};

exports.isTokenRevoked = (token) => {
  cleanupRevokedTokens();
  return revokedTokens.has(token);
};

exports.extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice(7).trim();
};

exports.generateOtpCode = (length = 6) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < length; i += 1) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];
  }

  return code;
};
