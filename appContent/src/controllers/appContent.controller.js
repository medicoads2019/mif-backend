const service = require("../services/appContent.service");

exports.getContent = async (req, res) => {
  try {
    const result = await service.getContent();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateContent = async (req, res) => {
  try {
    const result = await service.updateContent(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
