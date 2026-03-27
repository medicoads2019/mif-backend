const multer = require("multer");
const service = require("../services/business.service");
const logger = require("../utils/logger");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});
const VALID_STATUSES = ["APPROVED", "PENDING", "REJECTED", "DELETED"];
const DATE_REGEX = /^\d{2}-\d{2}-\d{4}$/;

exports.uploadSingle = upload.single("coverImage");

exports.createBusiness = async (req, res) => {
  const { businessName, businessDate, createdBy, uploadedBy } = req.body;
  const coverImage = req.file;
  if (!businessName || !businessName.trim())
    return res
      .status(400)
      .json({ success: false, message: "Business name is required" });
  const parsedDate =
    businessDate && businessDate.trim()
      ? service.parseDdMmYyyy(businessDate)
      : null;
  if (!createdBy || !createdBy.trim())
    return res
      .status(400)
      .json({ success: false, message: "CreatedBy is required" });
  if (!uploadedBy || !uploadedBy.trim())
    return res
      .status(400)
      .json({ success: false, message: "UploadedBy is required" });
  if (!coverImage)
    return res
      .status(400)
      .json({ success: false, message: "Cover image is required" });
  try {
    const result = await service.createBusiness(
      businessName.trim(),
      parsedDate,
      createdBy.trim(),
      uploadedBy.trim(),
      coverImage,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=createBusiness | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.addImageToBusiness = async (req, res) => {
  const { businessId } = req.params;
  const { imageId } = req.body;
  if (!businessId || !businessId.trim())
    return res
      .status(400)
      .json({ success: false, message: "BusinessId is required" });
  if (!imageId || !imageId.trim())
    return res
      .status(400)
      .json({ success: false, message: "ImageId is required" });
  try {
    const result = await service.addImageToBusiness(businessId, imageId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getAllBusinesss = async (req, res) => {
  try {
    const result = await service.getAllBusinesss();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await service.getById(req.params.businessId);
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
    return res
      .status(400)
      .json({ success: false, message: "Invalid status value" });
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

exports.getPublishedBusinesss = async (req, res) => {
  try {
    const result = await service.getPublishedBusinesss();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.searchByBusinessName = async (req, res) => {
  const { name } = req.query;
  if (!name || !name.trim())
    return res
      .status(400)
      .json({ success: false, message: "Business name must not be empty" });
  try {
    const result = await service.searchByBusinessName(name.trim());
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateBusinessCoverImage = async (req, res) => {
  const coverImage = req.file;
  if (!req.params.businessId || !req.params.businessId.trim())
    return res
      .status(400)
      .json({ success: false, message: "BusinessId is required" });
  if (!coverImage)
    return res
      .status(400)
      .json({ success: false, message: "Cover image is required" });
  try {
    const result = await service.updateBusinessCoverImage(
      req.params.businessId,
      coverImage,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.addImagePatch = async (req, res) => {
  try {
    const result = await service.addImageToBusiness(
      req.params.businessId,
      req.params.imageId,
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
    return res
      .status(400)
      .json({ success: false, message: "Invalid status value" });
  try {
    const result = await service.updateStatus(req.params.businessId, upper);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateBusinessName = async (req, res) => {
  const { businessName } = req.query;
  if (!businessName || !businessName.trim())
    return res
      .status(400)
      .json({ success: false, message: "Business name is required" });
  try {
    const result = await service.updateBusinessName(
      req.params.businessId,
      businessName.trim(),
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateBusinessDate = async (req, res) => {
  const { businessDate } = req.query;
  if (!businessDate || !DATE_REGEX.test(businessDate))
    return res.status(400).json({
      success: false,
      message: "Business date must be in format dd-MM-yyyy",
    });
  const parsedDate = service.parseDdMmYyyy(businessDate);
  if (!parsedDate)
    return res.status(400).json({ success: false, message: "Invalid date" });
  try {
    const result = await service.updateBusinessDate(
      req.params.businessId,
      parsedDate,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.removeImageFromBusiness = async (req, res) => {
  try {
    const result = await service.removeImageFromBusiness(
      req.params.businessId,
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
    const result = await service.softDelete(req.params.businessId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.restore = async (req, res) => {
  try {
    const result = await service.restore(req.params.businessId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const result = await service.hardDelete(req.params.businessId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
