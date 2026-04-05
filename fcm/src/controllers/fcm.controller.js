const service = require("../services/fcm.service");

exports.registerDeviceToken = async (req, res) => {
  try {
    const result = await service.registerDeviceToken(req.body || {});
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.unregisterDeviceToken = async (req, res) => {
  try {
    const result = await service.unregisterDeviceToken(req.body || {});
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getStats = async (req, res) => {
  try {
    const result = await service.getStats();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.sendNotification = async (req, res) => {
  try {
    const result = await service.sendNotification(req.body || {});
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
