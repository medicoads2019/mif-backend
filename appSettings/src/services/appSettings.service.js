const AppSettings = require("../models/appSettings.model");

const DEFAULT_SETTINGS = {
  settingsKey: "default",
  feedbackEmailId: "bhargavkachhadiya1988@gmail.com",
  customFrameDesignEmailId: "bhargavkachhadiya1988@gmail.com",
  deleteAccountUrl: "https://forms.gle/zsZuyiFwKZcehQ2H7",
  goAdFreePrice: "₹199/-",
  customFrameDesignPrice: "₹100/-",
  upiPaymentId: "9913560435@ybl",
  goAdFreeEmailId: "bhargavkachhadiya1988@gmail.com",
  goAdFreeWhatsAppNumber: "919913560435",
};

const normalizePayload = (data = {}) => ({
  feedbackEmailId: data.feedbackEmailId?.toString().trim() || "",
  customFrameDesignEmailId:
    data.customFrameDesignEmailId?.toString().trim() || "",
  deleteAccountUrl: data.deleteAccountUrl?.toString().trim() || "",
  goAdFreePrice: data.goAdFreePrice?.toString().trim() || "",
  customFrameDesignPrice: data.customFrameDesignPrice?.toString().trim() || "",
  upiPaymentId: data.upiPaymentId?.toString().trim() || "",
  goAdFreeEmailId: data.goAdFreeEmailId?.toString().trim() || "",
  goAdFreeWhatsAppNumber: data.goAdFreeWhatsAppNumber?.toString().trim() || "",
});

exports.getSettings = async () => {
  let settings = await AppSettings.findOne({ settingsKey: "default" });

  if (!settings) {
    settings = await AppSettings.create(DEFAULT_SETTINGS);
  }

  return { status: 200, body: { success: true, data: settings } };
};

exports.updateSettings = async (data) => {
  const payload = normalizePayload(data);

  const settings = await AppSettings.findOneAndUpdate(
    { settingsKey: "default" },
    { ...payload, $push: { updatedAt: new Date() } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  return {
    status: 200,
    body: { success: true, message: "App settings updated", data: settings },
  };
};
