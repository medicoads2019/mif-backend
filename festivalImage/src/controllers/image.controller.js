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
  const { festivalId, createdBy, uploadedBy } = req.body;
  const files = req.files;

  if (!festivalId || !festivalId.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "FestivalId is required" });
  }

  if (!files || files.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Files cannot be empty" });
  }

  try {
    const result = await service.batchUpload(
      festivalId.trim(),
      createdBy,
      uploadedBy,
      files,
    );
    return res.status(result.status).json(result.body);
  } catch (error) {
    logger.error(`CONTROLLER_ERROR | endpoint=batchUpload | ${error.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.batchDeleteByFestivalId = async (req, res) => {
  const { festivalId } = req.params;

  if (!festivalId || !festivalId.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "FestivalId is required" });
  }

  try {
    const result = await service.batchDeleteByFestivalId(festivalId.trim());
    return res.status(result.status).json(result.body);
  } catch (error) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=batchDeleteByFestivalId | ${error.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByStatus = async (req, res) => {
  const status = req.params.status ? req.params.status.toUpperCase() : "";

  if (!VALID_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid status value" });
  }

  try {
    const result = await service.getByStatus(status);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getBySoftDelete = async (req, res) => {
  const value =
    req.params.value === "true"
      ? true
      : req.params.value === "false"
        ? false
        : null;

  if (value === null) {
    return res
      .status(400)
      .json({ success: false, message: "Value must be true or false" });
  }

  try {
    const result = await service.getBySoftDelete(value);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByUserTypeAccess = async (req, res) => {
  const userTypeAccess = req.params.userTypeAccess
    ? req.params.userTypeAccess.toUpperCase()
    : "";

  if (!VALID_ACCESS.includes(userTypeAccess)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid userTypeAccess value" });
  }

  try {
    const result = await service.getByUserTypeAccess(userTypeAccess);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByOrientation = async (req, res) => {
  const orientation = req.params.orientation
    ? req.params.orientation.toUpperCase()
    : "";

  if (!VALID_ORIENTATIONS.includes(orientation)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid orientation value" });
  }

  try {
    const result = await service.getByOrientation(orientation);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByFestivalId = async (req, res) => {
  const { festivalId } = req.params;

  if (!festivalId || !festivalId.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "FestivalId is required" });
  }

  try {
    const result = await service.getByFestivalId(festivalId.trim());
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await service.getById(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.incrementView = async (req, res) => {
  try {
    const result = await service.incrementView(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.incrementLike = async (req, res) => {
  try {
    const result = await service.incrementLike(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.incrementDownload = async (req, res) => {
  try {
    const result = await service.incrementDownload(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateUserTypeAccess = async (req, res) => {
  const userTypeAccess = req.params.userTypeAccess
    ? req.params.userTypeAccess.toUpperCase()
    : "";

  if (!VALID_ACCESS.includes(userTypeAccess)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid userTypeAccess value" });
  }

  try {
    const result = await service.updateUserTypeAccess(
      req.params.id,
      userTypeAccess,
    );
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateStatus = async (req, res) => {
  const status = req.params.status ? req.params.status.toUpperCase() : "";

  if (!VALID_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid status value" });
  }

  try {
    const result = await service.updateStatus(req.params.id, status);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.reorderImages = async (req, res) => {
  const items = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Request cannot be empty" });
  }

  try {
    const result = await service.reorderImages(items);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.softDeleteImage = async (req, res) => {
  try {
    const result = await service.softDeleteImage(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.restoreImage = async (req, res) => {
  try {
    const result = await service.restoreImage(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.hardDeleteImage = async (req, res) => {
  try {
    const result = await service.hardDeleteImage(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
