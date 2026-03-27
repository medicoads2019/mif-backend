const mongoose = require("mongoose");

const BUSINESS_STATUS = ["APPROVED", "PENDING", "REJECTED", "DELETED"];

const auditLogSchema = new mongoose.Schema(
  {
    time: { type: Date },
    message: { type: String },
    action: { type: String },
    userId: { type: String },
  },
  { _id: false },
);

const businessSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, unique: true },
    businessDate: { type: Date },
    imageIds: { type: [String], default: [] },
    coverImageUrl: { type: String, default: null },
    coverThumbnailUrl: { type: String, default: null },
    coverOriginalPublicId: { type: String, default: null },
    coverThumbnailPublicId: { type: String, default: null },
    businessStatus: { type: String, enum: BUSINESS_STATUS, default: "PENDING" },
    previousStatus: { type: String, enum: BUSINESS_STATUS, default: null },
    softDelete: { type: Boolean, default: false },
    createdBy: { type: String },
    uploadedBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: [auditLogSchema], default: [] },
    publishedAt: { type: Date, default: null },
  },
  { collection: "businesss", timestamps: false },
);

businessSchema.index({ businessStatus: 1, softDelete: 1 });
businessSchema.index({ businessDate: 1 });

businessSchema.set("toJSON", { virtuals: true });
businessSchema.set("toObject", { virtuals: true });
businessSchema.virtual("businessId").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("Business", businessSchema);
