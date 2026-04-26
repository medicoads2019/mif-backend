const mongoose = global.mongoose || require("mongoose");

const appSettingsSchema = new mongoose.Schema(
  {
    settingsKey: {
      type: String,
      unique: true,
      default: "default",
      immutable: true,
      trim: true,
    },
    feedbackEmailId: {
      type: String,
      default: "bhargavkachhadiya1988@gmail.com",
      trim: true,
    },
    customFrameDesignEmailId: {
      type: String,
      default: "bhargavkachhadiya1988@gmail.com",
      trim: true,
    },
    deleteAccountUrl: {
      type: String,
      default: "https://forms.gle/zsZuyiFwKZcehQ2H7",
      trim: true,
    },
    goAdFreePrice: {
      type: String,
      default: "₹199/-",
      trim: true,
    },
    customFrameDesignPrice: {
      type: String,
      default: "₹100/-",
      trim: true,
    },
    upiPaymentId: {
      type: String,
      default: "9913560435@ybl",
      trim: true,
    },
    goAdFreeEmailId: {
      type: String,
      default: "bhargavkachhadiya1988@gmail.com",
      trim: true,
    },
    goAdFreeWhatsAppNumber: {
      type: String,
      default: "919913560435",
      trim: true,
    },
    updatedAt: [{ type: Date }],
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    collection: "app_settings",
  },
);

module.exports = mongoose.model("AppSettings", appSettingsSchema);
