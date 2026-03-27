const mongoose = require("mongoose");

const businessFrameSchema = new mongoose.Schema(
  {
    businessFrameName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    businessFrameCode: {
      type: String,
      unique: true,
      trim: true,
      default: null,
    },
    imageIds: [{ type: String }],
    coverImageUrl: { type: String, default: null },
    coverThumbnailUrl: { type: String, default: null },
    coverOriginalPublicId: { type: String, default: null },
    coverThumbnailPublicId: { type: String, default: null },
    businessFrameStatus: {
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
    collection: "businessframes",
  },
);

businessFrameSchema.set("toJSON", { virtuals: true });
businessFrameSchema.set("toObject", { virtuals: true });
businessFrameSchema.virtual("businessFrameId").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("BusinessFrame", businessFrameSchema);
