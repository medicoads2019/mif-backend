const mongoose = global.mongoose || require("mongoose");

const fcmSentNotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    clientIds: { type: [String], default: [] },
    data: { type: Map, of: String, default: {} },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    sentAt: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    collection: "fcm_sent_notifications",
  },
);

fcmSentNotificationSchema.set("toJSON", { virtuals: true });
fcmSentNotificationSchema.set("toObject", { virtuals: true });
fcmSentNotificationSchema.virtual("sentNotificationId").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("FcmSentNotification", fcmSentNotificationSchema);
