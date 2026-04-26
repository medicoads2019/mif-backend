const multer = require("multer");
const service = require("../services/clientFrame.service");
const logger = require("../utils/logger");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});
const VALID_STATUSES = ["APPROVED", "PENDING", "REJECTED", "DELETED"];

exports.uploadSingle = upload.single("coverImage");

exports.createClientFrame = async (req, res) => {
  const { clientFrameName, createdBy, uploadedBy } = req.body;
  const coverImage = req.file || null;
  if (!clientFrameName)
    return res
      .status(400)
      .json({ success: false, message: "clientFrameName is required" });
  try {
    const result = await service.createClientFrame(
      clientFrameName,
      createdBy,
      uploadedBy,
      coverImage,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | createClientFrame | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getAllClientFrames = async (req, res) => {
  try {
    const result = await service.getAllClientFrames();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getPublishedClientFrames = async (req, res) => {
  try {
    const result = await service.getPublishedClientFrames();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await service.getById(req.params.clientFrameId);
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
      req.params.clientFrameId,
      req.file,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateClientFrameName = async (req, res) => {
  const clientFrameName = req.query.clientFrameName || req.body.clientFrameName;
  if (!clientFrameName)
    return res
      .status(400)
      .json({ success: false, message: "clientFrameName is required" });
  try {
    const result = await service.updateClientFrameName(
      req.params.clientFrameId,
      clientFrameName,
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
    const result = await service.updateStatus(req.params.clientFrameId, upper);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.addImageToClientFrame = async (req, res) => {
  const { imageId } = req.body;
  if (!imageId)
    return res
      .status(400)
      .json({ success: false, message: "imageId is required" });
  try {
    const result = await service.addImageToClientFrame(
      req.params.clientFrameId,
      imageId,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.removeImageFromClientFrame = async (req, res) => {
  try {
    const result = await service.removeImageFromClientFrame(
      req.params.clientFrameId,
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
    const result = await service.softDelete(req.params.clientFrameId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.restore = async (req, res) => {
  try {
    const result = await service.restore(req.params.clientFrameId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const result = await service.hardDelete(req.params.clientFrameId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateCreatedBy = async (req, res) => {
  const createdBy = req.query.createdBy || req.body.createdBy;
  if (!createdBy)
    return res.status(400).json({ success: false, message: "createdBy is required" });
  try {
    const result = await service.updateCreatedBy(req.params.clientFrameId, createdBy);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.updateUploadedBy = async (req, res) => {
  const uploadedBy = req.query.uploadedBy || req.body.uploadedBy;
  if (!uploadedBy)
    return res.status(400).json({ success: false, message: "uploadedBy is required" });
  try {
    const result = await service.updateUploadedBy(req.params.clientFrameId, uploadedBy);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
