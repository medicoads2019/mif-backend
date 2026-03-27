const mongoose = require("mongoose");

const CATEGORY_STATUS = ["APPROVED", "PENDING", "REJECTED", "DELETED"];

const auditLogSchema = new mongoose.Schema(
  {
    time: { type: Date },
    message: { type: String },
    action: { type: String },
    userId: { type: String },
  },
  { _id: false },
);

const categorySchema = new mongoose.Schema(
  {
    categoryName: { type: String, required: true, unique: true },
    categoryDate: { type: Date },

    imageIds: { type: [String], default: [] },

    coverImageUrl: { type: String, default: null },
    coverThumbnailUrl: { type: String, default: null },
    coverOriginalPublicId: { type: String, default: null },
    coverThumbnailPublicId: { type: String, default: null },

    categoryStatus: {
      type: String,
      enum: CATEGORY_STATUS,
      default: "PENDING",
    },
    previousStatus: { type: String, enum: CATEGORY_STATUS, default: null },

    orderIndex: { type: Number, default: 0 },

    softDelete: { type: Boolean, default: false },

    createdBy: { type: String },
    uploadedBy: { type: String },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: [auditLogSchema], default: [] },
    publishedAt: { type: Date, default: null },
  },
  {
    collection: "categorys",
    timestamps: false,
  },
);

categorySchema.index({ categoryStatus: 1, softDelete: 1 });
categorySchema.index({ categoryDate: 1 });

categorySchema.set("toJSON", { virtuals: true });
categorySchema.set("toObject", { virtuals: true });
categorySchema.virtual("categoryId").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("Category", categorySchema);
