const multer = require("multer");
const service = require("../services/image.service");
const logger = require("../utils/logger");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});
const VALID_STATUSES = ["APPROVED", "PENDING", "REJECTED", "DELETED"];
const VALID_ORIENTATIONS = ["PORTRAIT", "LANDSCAPE", "SQUARE"];
const VALID_ACCESS = ["FREE", "PREMIUM"];

exports.uploadMultiple = upload.array("files", 50);

exports.batchUpload = async (req, res) => {
  const { clientFrameId, createdBy, uploadedBy } = req.body;
  const files = req.files;
  if (!clientFrameId)
    return res
      .status(400)
      .json({ success: false, message: "ClientFrameId is required" });
  if (!files || files.length === 0)
    return res
      .status(400)
      .json({ success: false, message: "Files are required" });
  try {
    const result = await service.batchUpload(
      clientFrameId,
      createdBy,
      uploadedBy,
      files,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | batchUpload | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await service.getById(req.params.id);
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

exports.getByUserTypeAccess = async (req, res) => {
  const upper = req.params.userTypeAccess
    ? req.params.userTypeAccess.toUpperCase()
    : "";
  if (!VALID_ACCESS.includes(upper))
    return res
      .status(400)
      .json({ success: false, message: "Invalid user type access" });
  try {
    const result = await service.getByUserTypeAccess(upper);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByOrientation = async (req, res) => {
  const upper = req.params.orientation
    ? req.params.orientation.toUpperCase()
    : "";
  if (!VALID_ORIENTATIONS.includes(upper))
    return res
      .status(400)
      .json({ success: false, message: "Invalid orientation" });
  try {
    const result = await service.getByOrientation(upper);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByClientFrameId = async (req, res) => {
  try {
    const result = await service.getByClientFrameId(req.params.clientFrameId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateUserTypeAccess = async (req, res) => {
  const upper = req.params.userTypeAccess
    ? req.params.userTypeAccess.toUpperCase()
    : "";
  if (!VALID_ACCESS.includes(upper))
    return res
      .status(400)
      .json({ success: false, message: "Invalid user type access" });
  try {
    const result = await service.updateUserTypeAccess(req.params.id, upper);
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
    const result = await service.updateStatus(req.params.id, upper);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.softDeleteImage = async (req, res) => {
  try {
    const result = await service.softDeleteImage(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.restoreImage = async (req, res) => {
  try {
    const result = await service.restoreImage(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.reorderImages = async (req, res) => {
  const items = req.body;
  if (!items || items.length === 0)
    return res
      .status(400)
      .json({ success: false, message: "Reorder list cannot be empty" });
  try {
    const result = await service.reorderImages(items);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.hardDeleteImage = async (req, res) => {
  try {
    const result = await service.hardDeleteImage(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.bulkSoftDeleteImages = async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0)
    return res
      .status(400)
      .json({ success: false, message: "ids array is required" });
  try {
    const result = await service.bulkSoftDeleteImages(ids);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.bulkRestoreImages = async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0)
    return res
      .status(400)
      .json({ success: false, message: "ids array is required" });
  try {
    const result = await service.bulkRestoreImages(ids);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.bulkHardDeleteImages = async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0)
    return res
      .status(400)
      .json({ success: false, message: "ids array is required" });
  try {
    const result = await service.bulkHardDeleteImages(ids);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.batchDeleteByClientFrameId = async (req, res) => {
  const { clientFrameId } = req.params;
  if (!clientFrameId)
    return res
      .status(400)
      .json({ success: false, message: "clientFrameId is required" });
  try {
    const result = await service.batchDeleteByClientFrameId(clientFrameId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=batchDeleteByClientFrameId | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
