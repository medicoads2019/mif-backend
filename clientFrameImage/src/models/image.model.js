const mongoose = require("mongoose");

const clientFrameImageSchema = new mongoose.Schema(
  {
    clientFrameId: { type: String, required: true, index: true },
    imageUrl: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    originalPublicId: { type: String, default: null },
    thumbnailPublicId: { type: String, default: null },
    orderIndex: { type: Number, default: 0 },
    orientation: {
      type: String,
      enum: ["PORTRAIT", "LANDSCAPE", "SQUARE"],
      default: "PORTRAIT",
    },
    userTypeAccess: {
      type: String,
      enum: ["FREE", "PREMIUM"],
      default: "FREE",
    },
    status: {
      type: String,
      enum: ["APPROVED", "PENDING", "REJECTED", "DELETED"],
      default: "PENDING",
    },
    previousStatus: { type: String, default: null },
    softDelete: { type: Boolean, default: false },
    createdBy: { type: String, default: null },
    uploadedBy: { type: String, default: null },
    updatedAt: [{ type: Date }],
    publishedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    collection: "clientframeimages",
  },
);

clientFrameImageSchema.set("toJSON", { virtuals: true });
clientFrameImageSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("ClientFrameImage", clientFrameImageSchema);
