const multer = require("multer");
const service = require("../services/businessFrame.service");
const logger = require("../utils/logger");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});
const VALID_STATUSES = ["APPROVED", "PENDING", "REJECTED", "DELETED"];

exports.uploadSingle = upload.single("coverImage");

exports.createBusinessFrame = async (req, res) => {
  const { businessFrameName, createdBy, uploadedBy } = req.body;
  if (!businessFrameName)
    return res
      .status(400)
      .json({ success: false, message: "businessFrameName is required" });
  try {
    const result = await service.createBusinessFrame(
      businessFrameName,
      createdBy,
      uploadedBy,
      req.file || null,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | createBusinessFrame | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getAllBusinessFrames = async (req, res) => {
  try {
    const result = await service.getAllBusinessFrames();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getPublishedBusinessFrames = async (req, res) => {
  try {
    const result = await service.getPublishedBusinessFrames();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await service.getById(req.params.businessFrameId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByCode = async (req, res) => {
  const { code } = req.params;
  if (!code)
    return res
      .status(400)
      .json({ success: false, message: "code is required" });
  try {
    const result = await service.getByCode(code);
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

exports.updateCoverImage = async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ success: false, message: "File is required" });
  try {
    const result = await service.updateCoverImage(
      req.params.businessFrameId,
      req.file,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateBusinessFrameName = async (req, res) => {
  const businessFrameName =
    req.query.businessFrameName || req.body.businessFrameName;
  if (!businessFrameName)
    return res
      .status(400)
      .json({ success: false, message: "businessFrameName is required" });
  try {
    const result = await service.updateBusinessFrameName(
      req.params.businessFrameId,
      businessFrameName,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateBusinessFrameCode = async (req, res) => {
  const businessFrameCode =
    req.query.businessFrameCode || req.body.businessFrameCode;
  if (!businessFrameCode)
    return res
      .status(400)
      .json({ success: false, message: "businessFrameCode is required" });
  try {
    const result = await service.updateBusinessFrameCode(
      req.params.businessFrameId,
      businessFrameCode,
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
    const result = await service.updateStatus(
      req.params.businessFrameId,
      upper,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.addImageToBusinessFrame = async (req, res) => {
  const { imageId } = req.body;
  if (!imageId)
    return res
      .status(400)
      .json({ success: false, message: "imageId is required" });
  try {
    const result = await service.addImageToBusinessFrame(
      req.params.businessFrameId,
      imageId,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.removeImageFromBusinessFrame = async (req, res) => {
  try {
    const result = await service.removeImageFromBusinessFrame(
      req.params.businessFrameId,
      req.params.imageId,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.softDelete = async (req, res) => {
  try {
    const result = await service.softDelete(req.params.businessFrameId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.restore = async (req, res) => {
  try {
    const result = await service.restore(req.params.businessFrameId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const result = await service.hardDelete(req.params.businessFrameId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
