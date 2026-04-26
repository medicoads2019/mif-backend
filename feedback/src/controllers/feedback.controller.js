const service = require("../services/feedback.service");

exports.createFeedback = async (req, res) => {
  try {
    const result = await service.createFeedback(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getAllFeedbacks = async (req, res) => {
  try {
    const result = await service.getAllFeedbacks(req.query);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await service.getById(req.params.feedbackId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const result = await service.updateStatus(
      req.params.feedbackId,
      req.body.status,
    );
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    const result = await service.deleteFeedback(req.params.feedbackId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getTrashFeedbacks = async (req, res) => {
  try {
    const result = await service.getTrashFeedbacks();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.restoreFeedback = async (req, res) => {
  try {
    const result = await service.restoreFeedback(req.params.feedbackId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.hardDeleteFeedback = async (req, res) => {
  try {
    const result = await service.hardDeleteFeedback(req.params.feedbackId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
