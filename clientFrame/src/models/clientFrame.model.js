const mongoose = require("mongoose");

const clientFrameSchema = new mongoose.Schema(
  {
    clientFrameName: { type: String, required: true, unique: true, trim: true },
    clientFrameCode: { type: String, unique: true, trim: true, default: null },
    imageIds: [{ type: String }],
    coverImageUrl: { type: String, default: null },
    coverThumbnailUrl: { type: String, default: null },
    coverOriginalPublicId: { type: String, default: null },
    coverThumbnailPublicId: { type: String, default: null },
    clientFrameStatus: {
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
    collection: "clientframes",
  },
);

clientFrameSchema.set("toJSON", { virtuals: true });
clientFrameSchema.set("toObject", { virtuals: true });
clientFrameSchema.virtual("clientFrameId").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("ClientFrame", clientFrameSchema);
