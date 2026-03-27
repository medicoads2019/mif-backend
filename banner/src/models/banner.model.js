const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    bannerName: { type: String, required: true, unique: true, trim: true },
    imageUrl: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    coverOriginalPublicId: { type: String, default: null },
    coverThumbnailPublicId: { type: String, default: null },
    bannerStatus: {
      type: String,
      enum: ["APPROVED", "PENDING", "REJECTED", "DELETED"],
      default: "PENDING",
    },
    previousStatus: { type: String, default: null },
    showInCarousel: { type: Boolean, default: false },
    orderIndex: { type: Number, default: 0 },
    softDelete: { type: Boolean, default: false },
    createdBy: { type: String, default: null },
    uploadedBy: { type: String, default: null },
    updatedAt: [{ type: Date }],
    publishedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    collection: "banners",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

bannerSchema.virtual("bannerId").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("Banner", bannerSchema);
