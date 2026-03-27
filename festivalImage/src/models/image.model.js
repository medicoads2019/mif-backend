const mongoose = global.mongoose || require("mongoose");

const IMAGE_STATUS = ["APPROVED", "PENDING", "REJECTED", "DELETED"];
const ORIENTATION_TYPES = ["PORTRAIT", "LANDSCAPE", "SQUARE"];
const USER_TYPE_ACCESS = ["FREE", "PREMIUM"];

const auditLogSchema = new mongoose.Schema(
  {
    time: { type: Date },
    message: { type: String },
    action: { type: String },
    userId: { type: String },
  },
  { _id: false },
);

const imageSchema = new mongoose.Schema(
  {
    festivalId: { type: String, required: true, index: true },
    imageUrl: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    originalPublicId: { type: String, default: null },
    thumbnailPublicId: { type: String, default: null },
    orderIndex: { type: Number, default: 0, index: true },
    orientation: {
      type: String,
      enum: ORIENTATION_TYPES,
      default: "SQUARE",
    },
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    createdBy: { type: String, default: null },
    uploadedBy: { type: String, default: null },
    userTypeAccess: {
      type: String,
      enum: USER_TYPE_ACCESS,
      default: "FREE",
    },
    softDelete: { type: Boolean, default: false },
    status: { type: String, enum: IMAGE_STATUS, default: "PENDING" },
    previousStatus: { type: String, enum: IMAGE_STATUS, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: [auditLogSchema], default: [] },
    publishedAt: { type: Date, default: null },
  },
  {
    collection: "festivalimages",
    timestamps: false,
  },
);

imageSchema.index({ festivalId: 1, softDelete: 1 });

module.exports = mongoose.model("FestivalImage", imageSchema);
