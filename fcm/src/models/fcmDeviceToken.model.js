const mongoose = global.mongoose || require("mongoose");

const fcmDeviceTokenSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["android", "ios", "web", "windows", "macos", "linux", "unknown"],
      default: "unknown",
    },
    appVersion: { type: String, default: null },
    deviceId: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now },
    updatedAt: [{ type: Date }],
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    collection: "fcm_device_tokens",
  },
);

fcmDeviceTokenSchema.set("toJSON", { virtuals: true });
fcmDeviceTokenSchema.set("toObject", { virtuals: true });
fcmDeviceTokenSchema.virtual("fcmDeviceTokenId").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("FcmDeviceToken", fcmDeviceTokenSchema);
