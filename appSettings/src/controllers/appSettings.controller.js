const service = require("../services/appSettings.service");

exports.getSettings = async (req, res) => {
  try {
    const result = await service.getSettings();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const result = await service.updateSettings(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
