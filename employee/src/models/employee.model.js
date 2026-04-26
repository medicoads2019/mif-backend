const mongoose = global.mongoose || require("mongoose");
const crypto = require("crypto");

const employeeSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, default: null, trim: true },
    lastName: { type: String, required: true, trim: true },

    profilePhotoOriginalUrl: { type: String, default: null },
    profilePhotoThumbnailUrl: { type: String, default: null },
    profilePhotoOriginalPublicId: { type: String, default: null },
    profilePhotoThumbnailPublicId: { type: String, default: null },

    dateOfBirth: { type: Date, default: null },
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER"], default: null },

    mobileNumber: { type: String, required: true, unique: true, trim: true },
    alternateMobileNumber: { type: String, default: null },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    mobileOtpVerified: { type: Boolean, default: false },
    emailOtpVerified: { type: Boolean, default: false },
    emailVerificationCode: { type: String, default: null },

    password: { type: String, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    userType: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "ADMIN",
        "SUPER_HR",
        "HR",
        "MARKETING",
        "MODERATOR",
        "USER",
      ],
      default: "USER",
    },

    referralCode: { type: String, default: null },
    myReferralCode: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(4).toString("hex").toUpperCase(),
    },

    userStatus: {
      type: String,
      enum: ["PENDING", "ACTIVE", "BLOCKED", "SUSPENDED"],
      default: "PENDING",
    },
    previousStatus: { type: String, default: null },

    lastActiveDate: { type: Date, default: null },

    softDelete: { type: Boolean, default: false },

    createdBy: { type: String, default: null },
    uploadedBy: { type: String, default: null },
    updatedAt: [{ type: Date }],
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    collection: "employees",
  },
);

employeeSchema.set("toJSON", { virtuals: true });
employeeSchema.set("toObject", { virtuals: true });
employeeSchema.virtual("employeeId").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("Employee", employeeSchema);
