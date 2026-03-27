const AppContent = require("../models/appContent.model");

const DEFAULT_CONTENT = {
  contentKey: "default",
  privacyPolicy: "",
  termsAndConditions: "",
};

const normalizePayload = (data = {}) => ({
  privacyPolicy: data.privacyPolicy?.toString() || "",
  termsAndConditions: data.termsAndConditions?.toString() || "",
});

exports.getContent = async () => {
  let content = await AppContent.findOne({ contentKey: "default" });

  if (!content) {
    content = await AppContent.create(DEFAULT_CONTENT);
  }

  return { status: 200, body: { success: true, data: content } };
};

exports.updateContent = async (data) => {
  const payload = normalizePayload(data);

  const content = await AppContent.findOneAndUpdate(
    { contentKey: "default" },
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
    body: { success: true, message: "App content updated", data: content },
  };
};
