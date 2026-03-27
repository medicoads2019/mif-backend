const mongoose = require("mongoose");

const IMAGE_STATUS = ["APPROVED", "PENDING", "REJECTED", "DELETED"];
const ORIENTATION = ["PORTRAIT", "LANDSCAPE", "SQUARE"];
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
    categoryId: { type: String, required: true },
    imageUrl: { type: String },
    thumbnailUrl: { type: String },
    originalPublicId: { type: String },
    thumbnailPublicId: { type: String },
    orderIndex: { type: Number, default: 0 },
    orientation: { type: String, enum: ORIENTATION, default: null },
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    userTypeAccess: { type: String, enum: USER_TYPE_ACCESS, default: "FREE" },
    status: { type: String, enum: IMAGE_STATUS, default: "PENDING" },
    softDelete: { type: Boolean, default: false },
    createdBy: { type: String },
    uploadedBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: [auditLogSchema], default: [] },
    publishedAt: { type: Date, default: null },
  },
  { collection: "categoryimages", timestamps: false },
);

imageSchema.index({ categoryId: 1, softDelete: 1 });
imageSchema.index({ status: 1, softDelete: 1 });
imageSchema.index({ orderIndex: 1 });

imageSchema.set("toJSON", { virtuals: true });
imageSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("CategoryImage", imageSchema);
