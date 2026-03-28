const mongoose = global.mongoose || require("mongoose");

const startScreenImageSchema = new mongoose.Schema(
  {
    imageName: { type: String, required: true, unique: true, trim: true },
    imageUrl: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    originalPublicId: { type: String, default: null },
    thumbnailPublicId: { type: String, default: null },
    indexValue: { type: Number, default: 0 },
    showInStartScreen: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    softDelete: { type: Boolean, default: false },
    createdBy: { type: String, default: null },
    updatedAt: [{ type: Date }],
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    collection: "startscreenimages",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

startScreenImageSchema.virtual("startScreenImageId").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("StartScreenImage", startScreenImageSchema);
