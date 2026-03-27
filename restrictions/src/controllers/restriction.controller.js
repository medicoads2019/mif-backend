const service = require("../services/restriction.service");

exports.getAll = async (req, res) => {
  try {
    const result = await service.getAll();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByUserType = async (req, res) => {
  try {
    const result = await service.getByUserType(req.params.userType);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.upsert = async (req, res) => {
  const { permissions } = req.body;
  if (!permissions || typeof permissions !== "object") {
    return res
      .status(400)
      .json({ success: false, message: "permissions object is required" });
  }
  try {
    const result = await service.upsert(req.params.userType, permissions);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.seedDefaults = async (req, res) => {
  try {
    const result = await service.seedDefaults();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
