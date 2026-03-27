const multer = require("multer");
const service = require("../services/banner.service");
const logger = require("../utils/logger");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});
const VALID_STATUSES = ["APPROVED", "PENDING", "REJECTED", "DELETED"];

exports.uploadSingle = upload.single("bannerImage");

exports.createBanner = async (req, res) => {
  const { bannerName, createdBy, uploadedBy } = req.body;
  if (!bannerName)
    return res
      .status(400)
      .json({ success: false, message: "bannerName is required" });
  try {
    const result = await service.createBanner(
      bannerName,
      createdBy,
      uploadedBy,
      req.file || null,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | createBanner | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getAllBanners = async (req, res) => {
  try {
    const result = await service.getAllBanners();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await service.getById(req.params.bannerId);
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

exports.getCarouselBanners = async (req, res) => {
  try {
    const result = await service.getCarouselBanners();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getPublishedBanners = async (req, res) => {
  try {
    const result = await service.getPublishedBanners();
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.searchBanners = async (req, res) => {
  const { name } = req.query;
  if (!name)
    return res
      .status(400)
      .json({ success: false, message: "name query param is required" });
  try {
    const result = await service.searchBanners(name);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateBannerImage = async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ success: false, message: "File is required" });
  try {
    const result = await service.updateBannerImage(
      req.params.bannerId,
      req.file,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateBannerName = async (req, res) => {
  const bannerName = req.query.bannerName || req.body.bannerName;
  if (!bannerName)
    return res
      .status(400)
      .json({ success: false, message: "bannerName is required" });
  try {
    const result = await service.updateBannerName(
      req.params.bannerId,
      bannerName,
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
    const result = await service.updateStatus(req.params.bannerId, upper);
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
    const result = await service.updateCarousel(req.params.bannerId, boolVal);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.reorderBanners = async (req, res) => {
  const items = req.body;
  if (!items || items.length === 0)
    return res
      .status(400)
      .json({ success: false, message: "Reorder list cannot be empty" });
  try {
    const result = await service.reorderBanners(items);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.softDelete = async (req, res) => {
  try {
    const result = await service.softDelete(req.params.bannerId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.restore = async (req, res) => {
  try {
    const result = await service.restore(req.params.bannerId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const result = await service.hardDelete(req.params.bannerId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
