const mongoose = require("mongoose");

const demoFrameSchema = new mongoose.Schema(
  {
    demoFrameName: { type: String, required: true, unique: true, trim: true },
    imageUrl: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    coverOriginalPublicId: { type: String, default: null },
    coverThumbnailPublicId: { type: String, default: null },
    demoFrameStatus: {
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
    collection: "demoFrames",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

demoFrameSchema.virtual("demoFrameId").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("DemoFrame", demoFrameSchema);
