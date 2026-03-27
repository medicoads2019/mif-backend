const multer = require("multer");
const service = require("../services/demoFrame.service");
const logger = require("../utils/logger");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});
const VALID_STATUSES = ["APPROVED", "PENDING", "REJECTED", "DELETED"];

exports.uploadSingle = upload.single("demoFrameImage");

exports.createDemoFrame = async (req, res) => {
  const { demoFrameName, createdBy, uploadedBy } = req.body;
  if (!demoFrameName)
    return res
      .status(400)
      .json({ success: false, message: "demoFrameName is required" });
  try {
    const result = await service.createDemoFrame(
      demoFrameName,
      createdBy,
      uploadedBy,
      req.file || null,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | createDemoFrame | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getAllDemoFrames = async (req, res) => {
  try {
    const result = await service.getAllDemoFrames();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await service.getById(req.params.demoFrameId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByStatus = async (req, res) => {
  const upper = req.params.status ? req.params.status.toUpperCase() : "";
  if (!VALID_STATUSES.includes(upper))
    return res.status(400).json({ success: false, message: "Invalid status" });
  try {
    const result = await service.getByStatus(upper);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getBySoftDelete = async (req, res) => {
  const boolVal =
    req.params.value === "true"
      ? true
      : req.params.value === "false"
        ? false
        : null;
  if (boolVal === null)
    return res
      .status(400)
      .json({ success: false, message: "Value must be true or false" });
  try {
    const result = await service.getBySoftDelete(boolVal);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getCarouselDemoFrames = async (req, res) => {
  try {
    const result = await service.getCarouselDemoFrames();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getPublishedDemoFrames = async (req, res) => {
  try {
    const result = await service.getPublishedDemoFrames();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.searchDemoFrames = async (req, res) => {
  const { name } = req.query;
  if (!name)
    return res
      .status(400)
      .json({ success: false, message: "name query param is required" });
  try {
    const result = await service.searchDemoFrames(name);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateDemoFrameImage = async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ success: false, message: "File is required" });
  try {
    const result = await service.updateDemoFrameImage(
      req.params.demoFrameId,
      req.file,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateDemoFrameName = async (req, res) => {
  const demoFrameName = req.query.demoFrameName || req.body.demoFrameName;
  if (!demoFrameName)
    return res
      .status(400)
      .json({ success: false, message: "demoFrameName is required" });
  try {
    const result = await service.updateDemoFrameName(
      req.params.demoFrameId,
      demoFrameName,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateStatus = async (req, res) => {
  const upper = req.params.status ? req.params.status.toUpperCase() : "";
  if (!VALID_STATUSES.includes(upper))
    return res.status(400).json({ success: false, message: "Invalid status" });
  try {
    const result = await service.updateStatus(req.params.demoFrameId, upper);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateCarousel = async (req, res) => {
  const boolVal =
    req.params.value === "true"
      ? true
      : req.params.value === "false"
        ? false
        : null;
  if (boolVal === null)
    return res
      .status(400)
      .json({ success: false, message: "Value must be true or false" });
  try {
    const result = await service.updateCarousel(
      req.params.demoFrameId,
      boolVal,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.reorderDemoFrames = async (req, res) => {
  const items = req.body;
  if (!items || items.length === 0)
    return res
      .status(400)
      .json({ success: false, message: "Reorder list cannot be empty" });
  try {
    const result = await service.reorderDemoFrames(items);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.softDelete = async (req, res) => {
  try {
    const result = await service.softDelete(req.params.demoFrameId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.restore = async (req, res) => {
  try {
    const result = await service.restore(req.params.demoFrameId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const result = await service.hardDelete(req.params.demoFrameId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
