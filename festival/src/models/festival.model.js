const mongoose = require("mongoose");

const FESTIVAL_STATUS = ["APPROVED", "PENDING", "REJECTED", "DELETED"];

const auditLogSchema = new mongoose.Schema(
  {
    time: { type: Date },
    message: { type: String },
    action: { type: String },
    userId: { type: String },
  },
  { _id: false },
);

const festivalSchema = new mongoose.Schema(
  {
    festivalName: { type: String, required: true, unique: true },
    festivalDate: { type: Date },

    imageIds: { type: [String], default: [] },

    coverImageUrl: { type: String, default: null },
    coverThumbnailUrl: { type: String, default: null },
    coverOriginalPublicId: { type: String, default: null },
    coverThumbnailPublicId: { type: String, default: null },

    festivalStatus: {
      type: String,
      enum: FESTIVAL_STATUS,
      default: "PENDING",
    },
    previousStatus: { type: String, enum: FESTIVAL_STATUS, default: null },

    softDelete: { type: Boolean, default: false },

    createdBy: { type: String },
    uploadedBy: { type: String },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: [auditLogSchema], default: [] },
    publishedAt: { type: Date, default: null },
  },
  {
    collection: "festival",
    timestamps: false,
  },
);

// Compound index matching the Java @CompoundIndex
festivalSchema.index({ festivalStatus: 1, softDelete: 1 });
festivalSchema.index({ festivalDate: 1 });

module.exports = mongoose.model("Festival", festivalSchema);
