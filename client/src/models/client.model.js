const mongoose = global.mongoose || require("mongoose");
const crypto = require("crypto");

const subscriptionSchema = new mongoose.Schema(
  {
    planId: { type: String, default: null },
    features: [{ type: String }],
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    autoRenew: { type: Boolean, default: false },
    subscriptionStatus: { type: String, default: null },
  },
  { _id: false },
);

const clientSchema = new mongoose.Schema(
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
    businessName: { type: String, default: null },
    businessCategory: { type: String, default: null },
    designation: { type: String, default: null },
    websiteUrl: { type: String, default: null },
    businessContactNumber: { type: String, default: null },
    businessWhatsappNumber: { type: String, default: null },
    socialMediaLinks: {
      instagram: { type: String, default: null },
      facebook: { type: String, default: null },
      youtube: { type: String, default: null },
      other: { type: String, default: null },
    },
    businessAddress: {
      addressLine1: { type: String, default: null },
      addressLine2: { type: String, default: null },
      city: { type: String, default: null },
      state: { type: String, default: null },
      country: { type: String, default: null },
      pincode: { type: String, default: null },
    },
    userType: {
      type: String,
      enum: ["DEMO", "PREMIUM", "GUEST"],
      default: "GUEST",
    },
    businessFrameIds: [{ type: String }],
    clientFrameIds: [{ type: String }],
    selectedFrameId: { type: String, default: null },
    currentSubscription: { type: subscriptionSchema, default: null },
    subscriptionHistory: [subscriptionSchema],
    referralCode: { type: String, default: null },
    myReferralCode: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(4).toString("hex").toUpperCase(),
    },
    clientStatus: {
      type: String,
      enum: ["PENDING", "ACTIVE", "BLOCKED", "SUSPENDED"],
      default: "PENDING",
    },
    previousStatus: { type: String, default: null },
    lastActiveDate: { type: Date, default: null },
    softDelete: { type: Boolean, default: false },
    createdBy: { type: String, default: null },
    updatedAt: [{ type: Date }],
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    collection: "clients",
  },
);

clientSchema.set("toJSON", { virtuals: true });
clientSchema.set("toObject", { virtuals: true });
clientSchema.virtual("clientId").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("Client", clientSchema);
