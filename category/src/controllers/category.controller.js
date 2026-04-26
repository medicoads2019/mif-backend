const multer = require("multer");
const service = require("../services/category.service");
const logger = require("../utils/logger");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const VALID_STATUSES = ["APPROVED", "PENDING", "REJECTED", "DELETED"];
const DATE_REGEX = /^\d{2}-\d{2}-\d{4}$/;

exports.uploadSingle = upload.single("coverImage");

exports.createCategory = async (req, res) => {
  const { categoryName, categoryDate, createdBy, uploadedBy } = req.body;
  const coverImage = req.file;

  logger.info(
    `API_REQUEST | method=POST | endpoint=create-category | categoryName=${categoryName}`,
  );

  if (!categoryName || !categoryName.trim())
    return res
      .status(400)
      .json({ success: false, message: "Category name is required" });
  const parsedDate =
    categoryDate && categoryDate.trim()
      ? service.parseDdMmYyyy(categoryDate)
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
    const result = await service.createCategory(
      categoryName.trim(),
      parsedDate,
      createdBy.trim(),
      uploadedBy.trim(),
      coverImage,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=createCategory | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.addImageToCategory = async (req, res) => {
  const { categoryId } = req.params;
  const { imageId } = req.body;

  if (!categoryId || !categoryId.trim())
    return res
      .status(400)
      .json({ success: false, message: "CategoryId is required" });
  if (!imageId || !imageId.trim())
    return res
      .status(400)
      .json({ success: false, message: "ImageId is required" });

  try {
    const result = await service.addImageToCategory(categoryId, imageId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=addImageToCategory | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getAllCategorys = async (req, res) => {
  logger.info("API_REQUEST | method=GET | endpoint=getAllCategorys");
  try {
    const result = await service.getAllCategorys();
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=getAllCategorys | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getById = async (req, res) => {
  const { categoryId } = req.params;
  if (!categoryId || !categoryId.trim())
    return res
      .status(400)
      .json({ success: false, message: "CategoryId is required" });

  try {
    const result = await service.getById(categoryId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=getById | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByStatus = async (req, res) => {
  const { status } = req.params;
  const upperStatus = status ? status.toUpperCase() : "";
  if (!VALID_STATUSES.includes(upperStatus))
    return res
      .status(400)
      .json({ success: false, message: "Invalid status value" });

  try {
    const result = await service.getByStatus(upperStatus);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=getByStatus | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getBySoftDelete = async (req, res) => {
  const { value } = req.params;
  const boolVal = value === "true" ? true : value === "false" ? false : null;
  if (boolVal === null)
    return res
      .status(400)
      .json({ success: false, message: "Value must be true or false" });

  try {
    const result = await service.getBySoftDelete(boolVal);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=getBySoftDelete | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getPublishedCategorys = async (req, res) => {
  try {
    const result = await service.getPublishedCategorys();
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=getPublishedCategorys | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.searchByCategoryName = async (req, res) => {
  const { name } = req.query;
  if (!name || !name.trim())
    return res
      .status(400)
      .json({ success: false, message: "Category name must not be empty" });

  try {
    const result = await service.searchByCategoryName(name.trim());
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=searchByCategoryName | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateCategoryCoverImage = async (req, res) => {
  const { categoryId } = req.params;
  const coverImage = req.file;

  if (!categoryId || !categoryId.trim())
    return res
      .status(400)
      .json({ success: false, message: "CategoryId is required" });
  if (!coverImage)
    return res
      .status(400)
      .json({ success: false, message: "Cover image is required" });

  try {
    const result = await service.updateCategoryCoverImage(
      categoryId,
      coverImage,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=updateCategoryCoverImage | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.addImagePatch = async (req, res) => {
  const { categoryId, imageId } = req.params;
  try {
    const result = await service.addImagePatch(categoryId, imageId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=addImagePatch | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateStatus = async (req, res) => {
  const { categoryId, status } = req.params;
  const upperStatus = status ? status.toUpperCase() : "";
  if (!VALID_STATUSES.includes(upperStatus))
    return res
      .status(400)
      .json({ success: false, message: "Invalid status value" });

  try {
    const result = await service.updateStatus(categoryId, upperStatus);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=updateStatus | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateCategoryName = async (req, res) => {
  const { categoryId } = req.params;
  const { categoryName } = req.query;
  if (!categoryName || !categoryName.trim())
    return res
      .status(400)
      .json({ success: false, message: "Category name is required" });

  try {
    const result = await service.updateCategoryName(
      categoryId,
      categoryName.trim(),
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=updateCategoryName | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateCategoryDate = async (req, res) => {
  const { categoryId } = req.params;
  const { categoryDate } = req.query;
  if (!categoryDate || !categoryDate.trim())
    return res
      .status(400)
      .json({ success: false, message: "Category date is required" });
  if (!DATE_REGEX.test(categoryDate))
    return res.status(400).json({
      success: false,
      message: "Category date must be in format dd-MM-yyyy",
    });
  const parsedDate = service.parseDdMmYyyy(categoryDate);
  if (!parsedDate)
    return res.status(400).json({ success: false, message: "Invalid date" });

  try {
    const result = await service.updateCategoryDate(categoryId, parsedDate);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=updateCategoryDate | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.removeImageFromCategory = async (req, res) => {
  const { categoryId, imageId } = req.params;
  try {
    const result = await service.removeImageFromCategory(categoryId, imageId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=removeImageFromCategory | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.softDelete = async (req, res) => {
  const { categoryId } = req.params;
  try {
    const result = await service.softDelete(categoryId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=softDelete | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.restore = async (req, res) => {
  const { categoryId } = req.params;
  try {
    const result = await service.restore(categoryId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=restore | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.hardDelete = async (req, res) => {
  const { categoryId } = req.params;
  try {
    const result = await service.hardDelete(categoryId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=hardDelete | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.reorderCategorys = async (req, res) => {
  const items = req.body;
  if (!items || items.length === 0)
    return res
      .status(400)
      .json({ success: false, message: "Reorder list cannot be empty" });
  try {
    const result = await service.reorderCategorys(items);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=reorderCategorys | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateCategoryCreatedBy = async (req, res) => {
  const { categoryId } = req.params;
  const { createdBy } = req.query;
  if (!createdBy || !createdBy.trim())
    return res
      .status(400)
      .json({ success: false, message: "createdBy is required" });
  try {
    const result = await service.updateCategoryCreatedBy(
      categoryId,
      createdBy.trim(),
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=updateCategoryCreatedBy | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateCategoryUploadedBy = async (req, res) => {
  const { categoryId } = req.params;
  const { uploadedBy } = req.query;
  if (!uploadedBy || !uploadedBy.trim())
    return res
      .status(400)
      .json({ success: false, message: "uploadedBy is required" });
  try {
    const result = await service.updateCategoryUploadedBy(
      categoryId,
      uploadedBy.trim(),
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=updateCategoryUploadedBy | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
