const mongoose = global.mongoose || require("mongoose");

const appContentSchema = new mongoose.Schema(
  {
    contentKey: {
      type: String,
      unique: true,
      default: "default",
      immutable: true,
      trim: true,
    },
    privacyPolicy: { type: String, default: "", trim: true },
    termsAndConditions: { type: String, default: "", trim: true },
    updatedAt: [{ type: Date }],
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    collection: "app_content",
  },
);

module.exports = mongoose.model("AppContent", appContentSchema);
