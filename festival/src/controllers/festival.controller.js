const multer = require("multer");
const service = require("../services/festival.service");
const logger = require("../utils/logger");

// Multer — memory storage, max 20 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const VALID_STATUSES = ["APPROVED", "PENDING", "REJECTED", "DELETED"];
const DATE_REGEX = /^\d{2}-\d{2}-\d{4}$/;

// ─── Exported middleware/handlers ─────────────────────────────────────────────

exports.uploadSingle = upload.single("coverImage");

// POST /festivals/create-festival
exports.createFestival = async (req, res) => {
  const { festivalName, festivalDate, createdBy, uploadedBy } = req.body;
  const coverImage = req.file;

  logger.info(
    `API_REQUEST | method=POST | endpoint=create-festival | festivalName=${festivalName}`,
  );

  if (!festivalName || !festivalName.trim()) {
    logger.warn("VALIDATION_FAILED | field=festivalName");
    return res
      .status(400)
      .json({ success: false, message: "Festival name is required" });
  }
  if (!festivalDate || !festivalDate.trim()) {
    logger.warn("VALIDATION_FAILED | field=festivalDate");
    return res
      .status(400)
      .json({ success: false, message: "Festival date is required" });
  }
  if (!DATE_REGEX.test(festivalDate)) {
    logger.warn(
      "VALIDATION_FAILED | field=festivalDate | reason=invalidFormat",
    );
    return res.status(400).json({
      success: false,
      message: "Festival date must be in format dd-MM-yyyy",
    });
  }
  const parsedDate = service.parseDdMmYyyy(festivalDate);
  if (!parsedDate) {
    logger.warn("VALIDATION_FAILED | field=festivalDate | reason=invalidDate");
    return res.status(400).json({
      success: false,
      message: "Festival date must be in format dd-MM-yyyy",
    });
  }
  if (!createdBy || !createdBy.trim()) {
    logger.warn("VALIDATION_FAILED | field=createdBy");
    return res
      .status(400)
      .json({ success: false, message: "CreatedBy is required" });
  }
  if (!uploadedBy || !uploadedBy.trim()) {
    logger.warn("VALIDATION_FAILED | field=uploadedBy");
    return res
      .status(400)
      .json({ success: false, message: "UploadedBy is required" });
  }
  if (!coverImage) {
    logger.warn("VALIDATION_FAILED | field=coverImage");
    return res
      .status(400)
      .json({ success: false, message: "Cover image is required" });
  }

  try {
    const result = await service.createFestival(
      festivalName.trim(),
      parsedDate,
      createdBy.trim(),
      uploadedBy.trim(),
      coverImage,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=createFestival | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// POST /festivals/:festivalId/images
exports.addImageToFestival = async (req, res) => {
  const { festivalId } = req.params;
  const { imageId } = req.body;

  logger.info(
    `API_REQUEST | method=POST | endpoint=addImageToFestival | festivalId=${festivalId}`,
  );

  if (!festivalId || !festivalId.trim())
    return res
      .status(400)
      .json({ success: false, message: "FestivalId is required" });
  if (!imageId || !imageId.trim())
    return res
      .status(400)
      .json({ success: false, message: "ImageId is required" });

  try {
    const result = await service.addImageToFestival(festivalId, imageId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=addImageToFestival | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /festivals/all
exports.getAllFestivals = async (req, res) => {
  logger.info("API_REQUEST | method=GET | endpoint=getAllFestivals");
  try {
    const result = await service.getAllFestivals();
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=getAllFestivals | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /festivals/:festivalId
exports.getById = async (req, res) => {
  const { festivalId } = req.params;
  logger.info(
    `API_REQUEST | method=GET | endpoint=getById | festivalId=${festivalId}`,
  );

  if (!festivalId || !festivalId.trim())
    return res
      .status(400)
      .json({ success: false, message: "FestivalId is required" });

  try {
    const result = await service.getById(festivalId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=getById | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /festivals/status/:status
exports.getByStatus = async (req, res) => {
  const { status } = req.params;
  logger.info(
    `API_REQUEST | method=GET | endpoint=getByStatus | status=${status}`,
  );

  if (!status || !status.trim())
    return res
      .status(400)
      .json({ success: false, message: "Status is required" });

  const upperStatus = status.toUpperCase();
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

// GET /festivals/soft-delete/:value
exports.getBySoftDelete = async (req, res) => {
  const { value } = req.params;
  logger.info(
    `API_REQUEST | method=GET | endpoint=getBySoftDelete | value=${value}`,
  );

  const boolValue = value === "true";

  try {
    const result = await service.getBySoftDelete(boolValue);
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

// GET /festivals/published
exports.getPublishedFestivals = async (req, res) => {
  logger.info("API_REQUEST | method=GET | endpoint=getPublishedFestivals");
  try {
    const result = await service.getPublishedFestivals();
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=getPublishedFestivals | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /festivals/search?name=
exports.searchByFestivalName = async (req, res) => {
  const { name } = req.query;
  logger.info(
    `API_REQUEST | method=GET | endpoint=searchByFestivalName | name=${name}`,
  );

  if (!name || !name.trim()) {
    logger.warn("VALIDATION_FAILED | field=name");
    return res
      .status(400)
      .json({ success: false, message: "Festival name is required" });
  }

  try {
    const result = await service.searchByFestivalName(name.trim());
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=searchByFestivalName | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// PATCH /festivals/:festivalId/cover-image
exports.updateFestivalCoverImage = async (req, res) => {
  const { festivalId } = req.params;
  const coverImage = req.file;

  logger.info(
    `API_REQUEST | method=PATCH | endpoint=updateFestivalCoverImage | festivalId=${festivalId}`,
  );

  if (!festivalId || !festivalId.trim())
    return res
      .status(400)
      .json({ success: false, message: "Invalid festival id" });
  if (!coverImage)
    return res
      .status(400)
      .json({ success: false, message: "Cover image is required" });

  try {
    const result = await service.updateFestivalCoverImage(
      festivalId,
      coverImage,
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=updateFestivalCoverImage | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// PATCH /festivals/:festivalId/images/:imageId
exports.addImagePatch = async (req, res) => {
  const { festivalId, imageId } = req.params;
  logger.info(
    `API_REQUEST | method=PATCH | endpoint=addImage | festivalId=${festivalId} | imageId=${imageId}`,
  );

  if (!festivalId || !festivalId.trim())
    return res
      .status(400)
      .json({ success: false, message: "FestivalId is required" });
  if (!imageId || !imageId.trim())
    return res
      .status(400)
      .json({ success: false, message: "ImageId is required" });

  try {
    const result = await service.addImageToFestival(festivalId, imageId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=addImagePatch | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// PATCH /festivals/:festivalId/status/:status
exports.updateStatus = async (req, res) => {
  const { festivalId, status } = req.params;
  logger.info(
    `API_REQUEST | method=PATCH | endpoint=updateStatus | festivalId=${festivalId} | status=${status}`,
  );

  if (!festivalId || !festivalId.trim())
    return res
      .status(400)
      .json({ success: false, message: "FestivalId is required" });

  const upperStatus = status ? status.toUpperCase() : "";
  if (!VALID_STATUSES.includes(upperStatus))
    return res
      .status(400)
      .json({ success: false, message: "Invalid status value" });

  try {
    const result = await service.updateStatus(festivalId, upperStatus);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=updateStatus | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// PATCH /festivals/:festivalId/name?festivalName=
exports.updateFestivalName = async (req, res) => {
  const { festivalId } = req.params;
  const { festivalName } = req.query;
  logger.info(
    `API_REQUEST | method=PATCH | endpoint=updateFestivalName | festivalId=${festivalId} | festivalName=${festivalName}`,
  );

  if (!festivalId || !festivalId.trim())
    return res
      .status(400)
      .json({ success: false, message: "FestivalId is required" });
  if (!festivalName || !festivalName.trim())
    return res
      .status(400)
      .json({ success: false, message: "Festival name is required" });

  try {
    const result = await service.updateFestivalName(
      festivalId,
      festivalName.trim(),
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=updateFestivalName | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// PATCH /festivals/:festivalId/date?festivalDate=
exports.updateFestivalDate = async (req, res) => {
  const { festivalId } = req.params;
  const { festivalDate } = req.query;
  logger.info(
    `API_REQUEST | method=PATCH | endpoint=updateFestivalDate | festivalId=${festivalId} | festivalDate=${festivalDate}`,
  );

  if (!festivalId || !festivalId.trim())
    return res
      .status(400)
      .json({ success: false, message: "FestivalId is required" });
  if (!festivalDate || !festivalDate.trim()) {
    logger.warn("VALIDATION_FAILED | field=festivalDate");
    return res
      .status(400)
      .json({ success: false, message: "Festival date is required" });
  }
  if (!DATE_REGEX.test(festivalDate)) {
    logger.warn(
      "VALIDATION_FAILED | field=festivalDate | reason=invalidFormat",
    );
    return res.status(400).json({
      success: false,
      message: "Festival date must be in format dd-MM-yyyy",
    });
  }
  const parsedDate = service.parseDdMmYyyy(festivalDate);
  if (!parsedDate) {
    logger.warn("VALIDATION_FAILED | field=festivalDate | reason=invalidDate");
    return res.status(400).json({
      success: false,
      message: "Festival date must be in format dd-MM-yyyy",
    });
  }

  try {
    const result = await service.updateFestivalDate(festivalId, parsedDate);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=updateFestivalDate | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// PATCH /festivals/:festivalId/created-by?createdBy=
exports.updateCreatedBy = async (req, res) => {
  const { festivalId } = req.params;
  const { createdBy } = req.query;
  if (!festivalId || !festivalId.trim())
    return res.status(400).json({ success: false, message: "FestivalId is required" });
  if (!createdBy || !createdBy.trim())
    return res.status(400).json({ success: false, message: "createdBy is required" });
  try {
    const result = await service.updateCreatedBy(festivalId, createdBy.trim());
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=updateCreatedBy | ${err.message}`);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PATCH /festivals/:festivalId/uploaded-by?uploadedBy=
exports.updateUploadedBy = async (req, res) => {
  const { festivalId } = req.params;
  const { uploadedBy } = req.query;
  if (!festivalId || !festivalId.trim())
    return res.status(400).json({ success: false, message: "FestivalId is required" });
  if (!uploadedBy || !uploadedBy.trim())
    return res.status(400).json({ success: false, message: "uploadedBy is required" });
  try {
    const result = await service.updateUploadedBy(festivalId, uploadedBy.trim());
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=updateUploadedBy | ${err.message}`);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PATCH /festivals/:festivalId/soft-delete
exports.softDelete = async (req, res) => {
  const { festivalId } = req.params;
  logger.info(
    `API_REQUEST | method=PATCH | endpoint=softDelete | festivalId=${festivalId}`,
  );

  if (!festivalId || !festivalId.trim())
    return res
      .status(400)
      .json({ success: false, message: "FestivalId is required" });

  try {
    const result = await service.softDelete(festivalId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=softDelete | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// PATCH /festivals/:festivalId/restore
exports.restore = async (req, res) => {
  const { festivalId } = req.params;
  logger.info(
    `API_REQUEST | method=PATCH | endpoint=restore | festivalId=${festivalId}`,
  );

  if (!festivalId || !festivalId.trim())
    return res
      .status(400)
      .json({ success: false, message: "FestivalId is required" });

  try {
    const result = await service.restore(festivalId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=restore | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// DELETE /festivals/:festivalId/images/:imageId
exports.removeImageFromFestival = async (req, res) => {
  const { festivalId, imageId } = req.params;
  logger.info(
    `API_REQUEST | method=DELETE | endpoint=removeImageFromFestival | festivalId=${festivalId} | imageId=${imageId}`,
  );

  if (!festivalId || !festivalId.trim())
    return res
      .status(400)
      .json({ success: false, message: "FestivalId is required" });
  if (!imageId || !imageId.trim())
    return res
      .status(400)
      .json({ success: false, message: "ImageId is required" });

  try {
    const result = await service.removeImageFromFestival(festivalId, imageId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(
      `CONTROLLER_ERROR | endpoint=removeImageFromFestival | ${err.message}`,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// DELETE /festivals/:festivalId/hard-delete
exports.hardDelete = async (req, res) => {
  const { festivalId } = req.params;
  logger.info(
    `API_REQUEST | method=DELETE | endpoint=hardDelete | festivalId=${festivalId}`,
  );

  if (!festivalId || !festivalId.trim())
    return res
      .status(400)
      .json({ success: false, message: "Invalid festival id" });

  try {
    const result = await service.hardDelete(festivalId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logger.error(`CONTROLLER_ERROR | endpoint=hardDelete | ${err.message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
