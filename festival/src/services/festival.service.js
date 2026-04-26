const Festival = require("../models/festival.model");
const cloudinary = require("../config/cloudinary");
const logger = require("../utils/logger");
const axios = require("axios");

const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT || 8058}`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskId(id) {
  if (!id || id.length < 8) return "****";
  return id.substring(0, 4) + "****";
}

function parseDdMmYyyy(str) {
  if (!str) return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  const date = new Date(
    Date.UTC(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10)),
  );
  return isNaN(date.getTime()) ? null : date;
}

function formatDdMmYyyy(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatIsoDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function mapToResponse(entity) {
  return {
    festivalId: entity._id.toString(),
    festivalName: entity.festivalName,
    festivalDate: formatIsoDate(entity.festivalDate),
    imageIds: entity.imageIds || [],
    coverImageUrl: entity.coverImageUrl || null,
    coverThumbnailUrl: entity.coverThumbnailUrl || null,
    coverOriginalPublicId: entity.coverOriginalPublicId || null,
    coverThumbnailPublicId: entity.coverThumbnailPublicId || null,
    festivalStatus: entity.festivalStatus,
    previousStatus: entity.previousStatus || null,
    softDelete: entity.softDelete,
    createdBy: entity.createdBy,
    uploadedBy: entity.uploadedBy,
    createdAt: entity.createdAt,
    publishedAt: entity.publishedAt || null,
  };
}

/**
 * Upload a buffer to Cloudinary using upload_stream.
 */
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * Returns 202 immediately; actual Cloudinary upload + DB save runs async in background.
 */
async function createFestival(
  festivalName,
  festivalDate,
  createdBy,
  uploadedBy,
  file,
) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=createFestival | festivalName=${festivalName}`,
  );

  const exists = await Festival.findOne({ festivalName });
  if (exists) {
    logger.warn(`DUPLICATE_FESTIVAL | festivalName=${festivalName}`);
    return {
      status: 400,
      body: { success: false, message: "Festival already exists" },
    };
  }

  // Kick off background processing without await
  processFestivalCreation(
    festivalName,
    festivalDate,
    createdBy,
    uploadedBy,
    file,
  ).catch((err) => {
    logger.error(
      `ASYNC_FAILED | festivalName=${festivalName} | exceptionType=${err.constructor.name}`,
    );
  });

  logger.info(
    `SERVICE_COMPLETE | operation=createFestival | durationMs=${Date.now() - start}`,
  );
  return {
    status: 202,
    body: { success: true, message: "Festival creation initiated" },
  };
}

async function processFestivalCreation(
  festivalName,
  festivalDate,
  createdBy,
  uploadedBy,
  file,
) {
  logger.info(`ASYNC_START | festivalName=${festivalName}`);

  const [original, thumb] = await Promise.all([
    uploadToCloudinary(file.buffer, { folder: "FestivalCoverOriginal" }),
    uploadToCloudinary(file.buffer, {
      folder: "FestivalCoverThumbnail",
      transformation: [
        {
          width: 800,
          height: 600,
          crop: "limit",
          quality: 20,
          fetch_format: "jpg",
        },
      ],
    }),
  ]);

  const festival = new Festival({
    festivalName,
    festivalDate,
    coverImageUrl: original.secure_url,
    coverThumbnailUrl: thumb.secure_url,
    coverOriginalPublicId: original.public_id,
    coverThumbnailPublicId: thumb.public_id,
    createdBy,
    uploadedBy,
  });

  const saved = await festival.save();
  logger.info(`ASYNC_SUCCESS | festivalId=${maskId(saved._id.toString())}`);
}

// ─── ADD IMAGE ID ─────────────────────────────────────────────────────────────

async function addImageToFestival(festivalId, imageId) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=addImageToFestival | festivalId=${maskId(festivalId)} | imageId=${maskId(imageId)}`,
  );

  // Try to add imageId only if not already present and not soft-deleted
  const result = await Festival.updateOne(
    { _id: festivalId, softDelete: { $ne: true }, imageIds: { $ne: imageId } },
    { $addToSet: { imageIds: imageId } },
  );

  if (result.matchedCount === 0) {
    const festivalExists = await Festival.exists({
      _id: festivalId,
      softDelete: { $ne: true },
    });
    if (!festivalExists) {
      logger.warn(
        `ADD_FAILED | festivalId=${maskId(festivalId)} | reason=notFoundOrSoftDeleted`,
      );
      return {
        status: 404,
        body: { success: false, message: "Festival not found or soft deleted" },
      };
    }
    logger.warn(
      `ADD_SKIPPED | festivalId=${maskId(festivalId)} | reason=imageAlreadyPresent`,
    );
    return {
      status: 200,
      body: {
        success: true,
        message: "Image already associated with festival",
      },
    };
  }

  logger.info(
    `IMAGE_ADDED_SUCCESS | festivalId=${maskId(festivalId)} | imageId=${maskId(imageId)} | durationMs=${Date.now() - start}`,
  );
  return {
    status: 200,
    body: { success: true, message: "Image added to festival successfully" },
  };
}

// ─── GET ALL ──────────────────────────────────────────────────────────────────

async function getAllFestivals() {
  logger.info("SERVICE_START | operation=getAllFestivals");
  const festivals = await Festival.find({
    $or: [{ softDelete: false }, { softDelete: null }],
  }).sort({ createdAt: -1 });
  logger.info(
    `DB_QUERY_SUCCESS | operation=getAllFestivals | resultCount=${festivals.length}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      count: festivals.length,
      data: festivals.map(mapToResponse),
    },
  };
}

// ─── GET BY ID ────────────────────────────────────────────────────────────────

async function getById(festivalId) {
  logger.info(
    `SERVICE_START | operation=getById | festivalId=${maskId(festivalId)}`,
  );
  const entity = await Festival.findById(festivalId);
  if (!entity) {
    logger.warn(
      `DB_QUERY_NOT_FOUND | operation=getById | festivalId=${maskId(festivalId)}`,
    );
    return {
      status: 404,
      body: { success: false, message: "Festival not found" },
    };
  }
  logger.info(
    `DB_QUERY_SUCCESS | operation=getById | festivalId=${maskId(festivalId)}`,
  );
  return { status: 200, body: { success: true, data: mapToResponse(entity) } };
}

// ─── GET BY STATUS ────────────────────────────────────────────────────────────

async function getByStatus(status) {
  logger.info(`SERVICE_START | operation=getByStatus | status=${status}`);
  const festivals = await Festival.find({
    festivalStatus: status,
    $or: [{ softDelete: false }, { softDelete: null }],
  }).sort({ createdAt: -1 });
  logger.info(
    `DB_QUERY_SUCCESS | operation=getByStatus | resultCount=${festivals.length}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      count: festivals.length,
      data: festivals.map(mapToResponse),
    },
  };
}

// ─── GET BY SOFT DELETE ───────────────────────────────────────────────────────

async function getBySoftDelete(value) {
  logger.info(`SERVICE_START | operation=getBySoftDelete | value=${value}`);
  const query = value
    ? { softDelete: true }
    : { $or: [{ softDelete: false }, { softDelete: null }] };
  const festivals = await Festival.find(query).sort({ createdAt: -1 });
  logger.info(
    `DB_QUERY_SUCCESS | operation=getBySoftDelete | resultCount=${festivals.length}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      count: festivals.length,
      data: festivals.map(mapToResponse),
    },
  };
}

// ─── SEARCH BY NAME ───────────────────────────────────────────────────────────

async function searchByFestivalName(name) {
  logger.info(`SERVICE_START | operation=searchByFestivalName | name=${name}`);
  const festivals = await Festival.find({
    festivalName: { $regex: name, $options: "i" },
    $or: [{ softDelete: false }, { softDelete: null }],
  }).sort({ createdAt: -1 });
  logger.info(
    `DB_QUERY_SUCCESS | operation=searchByFestivalName | resultCount=${festivals.length}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      count: festivals.length,
      data: festivals.map(mapToResponse),
    },
  };
}

// ─── GET PUBLISHED ────────────────────────────────────────────────────────────

async function getPublishedFestivals() {
  logger.info("SERVICE_START | operation=getPublishedFestivals");
  const festivals = await Festival.find({
    festivalStatus: "APPROVED",
    publishedAt: { $ne: null },
    $or: [{ softDelete: false }, { softDelete: null }],
  }).sort({ publishedAt: -1 });
  logger.info(
    `DB_QUERY_SUCCESS | operation=getPublishedFestivals | resultCount=${festivals.length}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      count: festivals.length,
      data: festivals.map(mapToResponse),
    },
  };
}

// ─── UPDATE COVER IMAGE ───────────────────────────────────────────────────────

async function updateFestivalCoverImage(festivalId, file) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=updateFestivalCoverImage | festivalId=${maskId(festivalId)}`,
  );

  const festival = await Festival.findOne({
    _id: festivalId,
    softDelete: { $ne: true },
  });
  if (!festival) {
    logger.warn(
      `UPDATE_FAILED | festivalId=${maskId(festivalId)} | reason=notFoundOrSoftDeleted`,
    );
    return {
      status: 404,
      body: { success: false, message: "Festival not found or soft deleted" },
    };
  }

  try {
    // Delete old Cloudinary images
    if (festival.coverOriginalPublicId) {
      await cloudinary.uploader.destroy(festival.coverOriginalPublicId);
    }
    if (festival.coverThumbnailPublicId) {
      await cloudinary.uploader.destroy(festival.coverThumbnailPublicId);
    }

    const [original, thumb] = await Promise.all([
      uploadToCloudinary(file.buffer, { folder: "FestivalCoverOriginal" }),
      uploadToCloudinary(file.buffer, {
        folder: "FestivalCoverThumbnail",
        transformation: [
          {
            width: 800,
            height: 600,
            crop: "limit",
            quality: 20,
            fetch_format: "jpg",
          },
        ],
      }),
    ]);

    festival.coverImageUrl = original.secure_url;
    festival.coverThumbnailUrl = thumb.secure_url;
    festival.coverOriginalPublicId = original.public_id;
    festival.coverThumbnailPublicId = thumb.public_id;
    await festival.save();

    logger.info(
      `FESTIVAL_IMAGE_UPDATED | festivalId=${maskId(festivalId)} | durationMs=${Date.now() - start}`,
    );
    return {
      status: 200,
      body: {
        success: true,
        message: "Festival cover image updated successfully",
        data: mapToResponse(festival),
      },
    };
  } catch (err) {
    logger.error(
      `IMAGE_UPDATE_FAILED | festivalId=${maskId(festivalId)} | exceptionType=${err.constructor.name}`,
    );
    return {
      status: 500,
      body: { success: false, message: "Failed to update cover image" },
    };
  }
}

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────

async function updateStatus(festivalId, newStatus) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=updateStatus | festivalId=${maskId(festivalId)}`,
  );

  const existing = await Festival.findOne({
    _id: festivalId,
    softDelete: { $ne: true },
  });
  if (!existing) {
    logger.warn(
      `UPDATE_FAILED | festivalId=${maskId(festivalId)} | reason=notFoundOrSoftDeleted`,
    );
    return {
      status: 404,
      body: { success: false, message: "Festival not found or soft deleted" },
    };
  }

  if (existing.festivalStatus === newStatus) {
    return {
      status: 200,
      body: { success: true, message: "No changes detected" },
    };
  }

  const oldStatus = existing.festivalStatus;
  existing.previousStatus = oldStatus;
  existing.festivalStatus = newStatus;

  // Auto-set publishedAt on first approval
  if (newStatus === "APPROVED" && !existing.publishedAt) {
    existing.publishedAt = new Date();
    logger.info(
      `AUTO_PUBLISH | festivalId=${maskId(festivalId)} | publishedAtSet=true`,
    );
  }

  await existing.save();

  logger.info(
    `STATUS_UPDATED | festivalId=${maskId(festivalId)} | from=${oldStatus} | to=${newStatus}`,
  );
  logger.info(
    `SERVICE_COMPLETE | operation=updateStatus | festivalId=${maskId(festivalId)} | durationMs=${Date.now() - start}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      message: "Status updated successfully",
      data: mapToResponse(existing),
    },
  };
}

// ─── UPDATE NAME ──────────────────────────────────────────────────────────────

async function updateFestivalName(festivalId, festivalName) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=updateFestivalName | festivalId=${maskId(festivalId)}`,
  );

  const existing = await Festival.findOne({
    _id: festivalId,
    softDelete: { $ne: true },
  });
  if (!existing) {
    logger.warn(
      `UPDATE_FAILED | festivalId=${maskId(festivalId)} | reason=notFoundOrSoftDeleted`,
    );
    return {
      status: 404,
      body: { success: false, message: "Festival not found or soft deleted" },
    };
  }

  if (existing.festivalName === festivalName) {
    return {
      status: 200,
      body: { success: true, message: "No changes detected" },
    };
  }

  existing.festivalName = festivalName;
  await existing.save();

  logger.info(
    `FESTIVAL_NAME_UPDATED | festivalId=${maskId(festivalId)} | durationMs=${Date.now() - start}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      message: "Festival name updated successfully",
      data: mapToResponse(existing),
    },
  };
}

// ─── UPDATE DATE ──────────────────────────────────────────────────────────────

async function updateFestivalDate(festivalId, festivalDate) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=updateFestivalDate | festivalId=${maskId(festivalId)}`,
  );

  const existing = await Festival.findOne({
    _id: festivalId,
    softDelete: { $ne: true },
  });
  if (!existing) {
    logger.warn(
      `UPDATE_FAILED | festivalId=${maskId(festivalId)} | reason=notFoundOrSoftDeleted`,
    );
    return {
      status: 404,
      body: { success: false, message: "Festival not found or soft deleted" },
    };
  }

  const existingFormatted = formatDdMmYyyy(existing.festivalDate);
  const newFormatted = formatDdMmYyyy(festivalDate);
  if (existingFormatted === newFormatted) {
    return {
      status: 200,
      body: { success: true, message: "No changes detected" },
    };
  }

  existing.festivalDate = festivalDate;
  await existing.save();

  logger.info(
    `FESTIVAL_DATE_UPDATED | festivalId=${maskId(festivalId)} | durationMs=${Date.now() - start}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      message: "Festival date updated successfully",
      data: mapToResponse(existing),
    },
  };
}

// ─── UPDATE CREATED BY ───────────────────────────────────────────────────────

async function updateCreatedBy(festivalId, createdBy) {
  const existing = await Festival.findOne({
    _id: festivalId,
    softDelete: { $ne: true },
  });
  if (!existing) {
    return {
      status: 404,
      body: { success: false, message: "Festival not found or soft deleted" },
    };
  }
  if (existing.createdBy === createdBy) {
    return { status: 200, body: { success: true, message: "No changes detected" } };
  }
  existing.createdBy = createdBy;
  await existing.save();
  return {
    status: 200,
    body: { success: true, message: "CreatedBy updated successfully", data: mapToResponse(existing) },
  };
}

// ─── UPDATE UPLOADED BY ───────────────────────────────────────────────────────

async function updateUploadedBy(festivalId, uploadedBy) {
  const existing = await Festival.findOne({
    _id: festivalId,
    softDelete: { $ne: true },
  });
  if (!existing) {
    return {
      status: 404,
      body: { success: false, message: "Festival not found or soft deleted" },
    };
  }
  if (existing.uploadedBy === uploadedBy) {
    return { status: 200, body: { success: true, message: "No changes detected" } };
  }
  existing.uploadedBy = uploadedBy;
  await existing.save();
  return {
    status: 200,
    body: { success: true, message: "UploadedBy updated successfully", data: mapToResponse(existing) },
  };
}

// ─── SOFT DELETE ──────────────────────────────────────────────────────────────

async function softDelete(festivalId) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=softDelete | festivalId=${maskId(festivalId)}`,
  );

  const existing = await Festival.findOne({
    _id: festivalId,
    softDelete: { $ne: true },
  });
  if (!existing) {
    logger.warn(
      `DELETE_FAILED | festivalId=${maskId(festivalId)} | reason=notFoundOrAlreadyDeleted`,
    );
    return {
      status: 404,
      body: {
        success: false,
        message: "Festival not found or already deleted",
      },
    };
  }

  const prevStatus = existing.festivalStatus;
  existing.softDelete = true;
  existing.previousStatus = prevStatus;
  existing.festivalStatus = "DELETED";
  await existing.save();

  logger.info(
    `SOFT_DELETE_SUCCESS | festivalId=${maskId(festivalId)} | previousStatus=${prevStatus} | durationMs=${Date.now() - start}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      message: "Festival soft deleted successfully",
      data: mapToResponse(existing),
    },
  };
}

// ─── RESTORE ──────────────────────────────────────────────────────────────────

async function restore(festivalId) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=restore | festivalId=${maskId(festivalId)}`,
  );

  const existing = await Festival.findOne({
    _id: festivalId,
    softDelete: true,
  });
  if (!existing) {
    logger.warn(
      `RESTORE_FAILED | festivalId=${maskId(festivalId)} | reason=notFoundOrNotDeleted`,
    );
    return {
      status: 404,
      body: { success: false, message: "Festival not found or not deleted" },
    };
  }

  if (!existing.previousStatus) {
    logger.warn(
      `RESTORE_FAILED | festivalId=${maskId(festivalId)} | reason=missingPreviousStatus`,
    );
    return {
      status: 400,
      body: {
        success: false,
        message: "Cannot restore — previous status missing",
      },
    };
  }

  const restoredStatus = existing.previousStatus;
  existing.softDelete = false;
  existing.festivalStatus = restoredStatus;
  existing.previousStatus = undefined;
  await existing.save();

  logger.info(
    `RESTORE_SUCCESS | festivalId=${maskId(festivalId)} | restoredStatus=${restoredStatus} | durationMs=${Date.now() - start}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      message: "Festival restored successfully",
      data: mapToResponse(existing),
    },
  };
}

// ─── REMOVE IMAGE ID ──────────────────────────────────────────────────────────

async function removeImageFromFestival(festivalId, imageId) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=removeImageFromFestival | festivalId=${maskId(festivalId)} | imageId=${maskId(imageId)}`,
  );

  const result = await Festival.updateOne(
    { _id: festivalId, softDelete: { $ne: true }, imageIds: imageId },
    { $pull: { imageIds: imageId } },
  );

  if (result.matchedCount === 0) {
    logger.warn(
      `REMOVE_FAILED | festivalId=${maskId(festivalId)} | reason=notFoundOrImageNotPresent`,
    );
    return {
      status: 404,
      body: {
        success: false,
        message: "Festival not found, soft deleted, or image not associated",
      },
    };
  }

  logger.info(
    `IMAGE_REMOVED_SUCCESS | festivalId=${maskId(festivalId)} | imageId=${maskId(imageId)} | durationMs=${Date.now() - start}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      message: "Image removed from festival successfully",
    },
  };
}

// ─── HARD DELETE ──────────────────────────────────────────────────────────────

async function hardDelete(festivalId) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=hardDelete | festivalId=${maskId(festivalId)}`,
  );

  const festival = await Festival.findById(festivalId);
  if (!festival) {
    logger.warn(
      `DELETE_FAILED | festivalId=${maskId(festivalId)} | reason=notFound`,
    );
    return {
      status: 404,
      body: { success: false, message: "Festival not found" },
    };
  }

  if (!festival.softDelete) {
    logger.warn(
      `DELETE_BLOCKED | festivalId=${maskId(festivalId)} | reason=notSoftDeleted`,
    );
    return {
      status: 400,
      body: {
        success: false,
        message: "Festival must be soft deleted before hard delete",
      },
    };
  }

  try {
    if (festival.coverOriginalPublicId) {
      await cloudinary.uploader.destroy(festival.coverOriginalPublicId);
      logger.info(
        `CLOUDINARY_DELETE | type=original | publicId=${festival.coverOriginalPublicId}`,
      );
    }
    if (festival.coverThumbnailPublicId) {
      await cloudinary.uploader.destroy(festival.coverThumbnailPublicId);
      logger.info(
        `CLOUDINARY_DELETE | type=thumbnail | publicId=${festival.coverThumbnailPublicId}`,
      );
    }
  } catch (err) {
    logger.error(
      `CLOUDINARY_DELETE_FAILED | festivalId=${maskId(festivalId)} | exceptionType=${err.constructor.name}`,
    );
  }

  await Festival.findByIdAndDelete(festivalId);

  axios
    .delete(`${BACKEND_BASE_URL}/festivalimages/by-festival/${festivalId}`)
    .catch((error) => {
      logger.warn(
        `EXTERNAL_CALL_FAILED | service=FestivalImageService | festivalId=${maskId(festivalId)} | error=${error.message}`,
      );
    });

  logger.info(
    `HARD_DELETE_SUCCESS | festivalId=${maskId(festivalId)} | durationMs=${Date.now() - start}`,
  );
  return {
    status: 200,
    body: { success: true, message: "Festival permanently deleted" },
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  parseDdMmYyyy,
  createFestival,
  addImageToFestival,
  getAllFestivals,
  getById,
  getByStatus,
  getBySoftDelete,
  searchByFestivalName,
  getPublishedFestivals,
  updateFestivalCoverImage,
  updateStatus,
  updateFestivalName,
  updateFestivalDate,
  updateCreatedBy,
  updateUploadedBy,
  softDelete,
  restore,
  removeImageFromFestival,
  hardDelete,
};
