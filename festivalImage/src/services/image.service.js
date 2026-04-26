const axios = require("axios");
const Image = require("../models/image.model");
const cloudinary = require("../config/cloudinary");
const logger = require("../utils/logger");

const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT || 8058}`);

function maskId(id) {
  if (!id || id.length < 8) return "****";
  return id.substring(0, 4) + "****";
}

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

function mapToResponse(entity) {
  return {
    id: entity._id.toString(),
    festivalId: entity.festivalId,
    imageUrl: entity.imageUrl,
    thumbnailUrl: entity.thumbnailUrl,
    originalPublicId: entity.originalPublicId,
    thumbnailPublicId: entity.thumbnailPublicId,
    orderIndex: entity.orderIndex,
    orientation: entity.orientation,
    viewCount: entity.viewCount,
    likeCount: entity.likeCount,
    downloadCount: entity.downloadCount,
    createdBy: entity.createdBy,
    uploadedBy: entity.uploadedBy,
    userTypeAccess: entity.userTypeAccess,
    softDelete: entity.softDelete,
    status: entity.status,
    previousStatus: entity.previousStatus || null,
    createdAt: entity.createdAt,
    publishedAt: entity.publishedAt || null,
  };
}

async function batchUpload(festivalId, createdBy, uploadedBy, files) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=batchUpload | festivalId=${maskId(festivalId)} | fileCount=${files ? files.length : 0}`,
  );

  const successList = [];
  const failureList = [];

  for (const file of files) {
    const fileName = file.originalname || "unknown";

    try {
      if (!file.buffer || file.buffer.length === 0) {
        throw new Error("File buffer is empty");
      }

      const [original, thumb] = await Promise.all([
        uploadToCloudinary(file.buffer, { folder: "FestivalImageOriginal" }),
        uploadToCloudinary(file.buffer, {
          folder: "FestivalImageThumbnail",
          transformation: [
            {
              width: 600,
              height: 600,
              crop: "limit",
              quality: 40,
              fetch_format: "jpg",
            },
          ],
        }),
      ]);

      const count = await Image.countDocuments({ festivalId });
      const entity = new Image({
        festivalId,
        imageUrl: original.secure_url,
        thumbnailUrl: thumb.secure_url,
        originalPublicId: original.public_id,
        thumbnailPublicId: thumb.public_id,
        orderIndex: count + 1,
        createdBy,
        uploadedBy,
      });

      const saved = await entity.save();

      try {
        await axios.post(`${BACKEND_BASE_URL}/festivals/${festivalId}/images`, {
          imageId: saved._id.toString(),
        });
      } catch (error) {
        logger.warn(
          `EXTERNAL_CALL_FAILED | service=FestivalService | imageId=${maskId(saved._id.toString())} | error=${error.message}`,
        );
      }

      successList.push(mapToResponse(saved));
    } catch (error) {
      logger.error(
        `UPLOAD_FAILED | file=${fileName} | exceptionType=${error.constructor.name}`,
      );
      failureList.push({ file: fileName, error: "Upload failed" });
    }
  }

  logger.info(
    `SERVICE_COMPLETE | operation=batchUpload | festivalId=${maskId(festivalId)} | success=${successList.length} | failed=${failureList.length} | durationMs=${Date.now() - start}`,
  );

  return {
    status: 200,
    body: {
      success: true,
      total: files.length,
      uploaded: successList.length,
      failed: failureList.length,
      images: successList,
      failures: failureList,
    },
  };
}

async function getById(id) {
  const entity = await Image.findById(id);

  if (!entity) {
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };
  }

  return { status: 200, body: { success: true, data: mapToResponse(entity) } };
}

async function getByStatus(status) {
  const images = await Image.find({
    status,
    $or: [{ softDelete: false }, { softDelete: null }],
  }).sort({ orderIndex: 1 });

  return {
    status: 200,
    body: {
      success: true,
      count: images.length,
      data: images.map(mapToResponse),
    },
  };
}

async function getBySoftDelete(softDelete) {
  const query = softDelete
    ? { softDelete: true }
    : { $or: [{ softDelete: false }, { softDelete: null }] };
  const images = await Image.find(query).sort({ orderIndex: 1 });

  return {
    status: 200,
    body: {
      success: true,
      count: images.length,
      data: images.map(mapToResponse),
    },
  };
}

async function getByUserTypeAccess(userTypeAccess) {
  const images = await Image.find({ userTypeAccess }).sort({ orderIndex: 1 });

  return {
    status: 200,
    body: {
      success: true,
      count: images.length,
      data: images.map(mapToResponse),
    },
  };
}

async function getByOrientation(orientation) {
  const images = await Image.find({ orientation }).sort({ orderIndex: 1 });

  return {
    status: 200,
    body: {
      success: true,
      count: images.length,
      data: images.map(mapToResponse),
    },
  };
}

async function getByFestivalId(festivalId) {
  const images = await Image.find({ festivalId }).sort({ orderIndex: 1 });

  return {
    status: 200,
    body: {
      success: true,
      activeImages: images
        .filter((image) => !image.softDelete)
        .map(mapToResponse),
      deletedImages: images
        .filter((image) => image.softDelete)
        .map(mapToResponse),
    },
  };
}

async function incrementView(id) {
  const result = await Image.updateOne(
    { _id: id, softDelete: { $ne: true } },
    { $inc: { viewCount: 1 } },
  );

  if (result.matchedCount === 0) {
    return {
      status: 404,
      body: { success: false, message: "Image not found or soft deleted" },
    };
  }

  return {
    status: 200,
    body: { success: true, message: "View count incremented successfully" },
  };
}

async function incrementLike(id) {
  const result = await Image.updateOne(
    { _id: id, softDelete: { $ne: true } },
    { $inc: { likeCount: 1 } },
  );

  if (result.matchedCount === 0) {
    return {
      status: 404,
      body: { success: false, message: "Image not found or soft deleted" },
    };
  }

  return {
    status: 200,
    body: { success: true, message: "Like count incremented successfully" },
  };
}

async function incrementDownload(id) {
  const result = await Image.updateOne(
    { _id: id, softDelete: { $ne: true } },
    { $inc: { downloadCount: 1 } },
  );

  if (result.matchedCount === 0) {
    return {
      status: 404,
      body: { success: false, message: "Image not found or soft deleted" },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      message: "Download count incremented successfully",
    },
  };
}

async function updateUserTypeAccess(id, userTypeAccess) {
  const result = await Image.updateOne(
    { _id: id, softDelete: { $ne: true } },
    { $set: { userTypeAccess } },
  );

  if (result.matchedCount === 0) {
    return {
      status: 404,
      body: { success: false, message: "Image not found or soft deleted" },
    };
  }

  return {
    status: 200,
    body: { success: true, message: "UserTypeAccess updated successfully" },
  };
}

async function updateStatus(id, newStatus) {
  const existing = await Image.findOne({ _id: id, softDelete: { $ne: true } });

  if (!existing) {
    return {
      status: 404,
      body: { success: false, message: "Image not found or soft deleted" },
    };
  }

  if (existing.status === newStatus) {
    return {
      status: 200,
      body: { success: true, message: "No changes detected" },
    };
  }

  existing.previousStatus = existing.status;
  existing.status = newStatus;

  if (newStatus === "APPROVED" && !existing.publishedAt) {
    existing.publishedAt = new Date();
  }

  await existing.save();

  return {
    status: 200,
    body: {
      success: true,
      message: "Status updated successfully",
      data: mapToResponse(existing),
    },
  };
}

async function reorderImages(items) {
  await Promise.all(
    items.map(({ imageId, orderIndex }) =>
      Image.updateOne({ _id: imageId }, { $set: { orderIndex } }),
    ),
  );

  return {
    status: 200,
    body: { success: true, message: "Image order updated successfully" },
  };
}

async function softDeleteImage(id) {
  const existing = await Image.findOne({ _id: id, softDelete: { $ne: true } });

  if (!existing) {
    return {
      status: 404,
      body: { success: false, message: "Image not found or already deleted" },
    };
  }

  existing.softDelete = true;
  existing.previousStatus = existing.status;
  existing.status = "DELETED";
  await existing.save();

  return {
    status: 200,
    body: {
      success: true,
      message: "Image soft deleted successfully",
      data: mapToResponse(existing),
    },
  };
}

async function restoreImage(id) {
  const existing = await Image.findOne({ _id: id, softDelete: true });

  if (!existing) {
    return {
      status: 404,
      body: { success: false, message: "Image not found or not deleted" },
    };
  }

  if (!existing.previousStatus) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Cannot restore - previous status missing",
      },
    };
  }

  existing.softDelete = false;
  existing.status = existing.previousStatus;
  existing.previousStatus = undefined;
  await existing.save();

  return {
    status: 200,
    body: {
      success: true,
      message: "Image restored successfully",
      data: mapToResponse(existing),
    },
  };
}

async function batchDeleteByFestivalId(festivalId) {
  const images = await Image.find({ festivalId });

  processBatchDeleteByFestivalId(images, festivalId).catch((error) => {
    logger.error(
      `ASYNC_BATCH_DELETE_FAILED | festivalId=${maskId(festivalId)} | error=${error.message}`,
    );
  });

  return {
    status: 202,
    body: {
      success: true,
      message: "Batch delete initiated",
      count: images.length,
    },
  };
}

async function processBatchDeleteByFestivalId(images, festivalId) {
  logger.info(
    `ASYNC_BATCH_DELETE_START | festivalId=${maskId(festivalId)} | imageCount=${images.length}`,
  );

  for (const entity of images) {
    const id = entity._id.toString();

    try {
      if (entity.originalPublicId) {
        await cloudinary.uploader
          .destroy(entity.originalPublicId)
          .catch(() => {});
      }

      if (entity.thumbnailPublicId) {
        await cloudinary.uploader
          .destroy(entity.thumbnailPublicId)
          .catch(() => {});
      }

      await Image.deleteOne({ _id: id });
    } catch (error) {
      logger.error(
        `BATCH_DELETE_IMAGE_FAILED | imageId=${maskId(id)} | error=${error.message}`,
      );
    }
  }

  logger.info(`ASYNC_BATCH_DELETE_COMPLETE | festivalId=${maskId(festivalId)}`);
}

async function hardDeleteImage(id) {
  const entity = await Image.findById(id);

  if (!entity) {
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };
  }

  if (!entity.softDelete) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Only soft deleted images can be permanently deleted",
      },
    };
  }

  performImageHardDelete(entity).catch((error) => {
    logger.error(
      `ASYNC_DELETE_FAILED | imageId=${maskId(id)} | error=${error.message}`,
    );
  });

  return {
    status: 202,
    body: { success: true, message: "Hard delete initiated successfully" },
  };
}

async function performImageHardDelete(entity) {
  const id = entity._id.toString();

  if (entity.originalPublicId) {
    await cloudinary.uploader.destroy(entity.originalPublicId);
  }

  if (entity.thumbnailPublicId) {
    await cloudinary.uploader.destroy(entity.thumbnailPublicId);
  }

  await Image.findByIdAndDelete(id);

  if (entity.festivalId) {
    try {
      await axios.delete(
        `${BACKEND_BASE_URL}/festivals/${entity.festivalId}/images/${id}`,
      );
    } catch (error) {
      logger.warn(
        `EXTERNAL_CALL_FAILED | service=FestivalService | imageId=${maskId(id)} | error=${error.message}`,
      );
    }
  }
}

async function bulkSoftDeleteImages(ids) {
  const results = { success: [], failed: [] };

  for (const id of ids) {
    try {
      const existing = await Image.findOne({ _id: id, softDelete: { $ne: true } });
      if (!existing) {
        results.failed.push({ id, reason: "Not found or already deleted" });
        continue;
      }
      existing.previousStatus = existing.status;
      existing.status = "DELETED";
      existing.softDelete = true;
      await existing.save();
      results.success.push(id);
    } catch (error) {
      results.failed.push({ id, reason: error.message });
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      message: "Bulk soft delete completed",
      successCount: results.success.length,
      failedCount: results.failed.length,
      failed: results.failed,
    },
  };
}

async function bulkRestoreImages(ids) {
  const results = { success: [], failed: [] };

  for (const id of ids) {
    try {
      const existing = await Image.findOne({ _id: id, softDelete: true });
      if (!existing) {
        results.failed.push({ id, reason: "Not found or not deleted" });
        continue;
      }
      if (!existing.previousStatus) {
        results.failed.push({ id, reason: "Previous status missing" });
        continue;
      }
      existing.softDelete = false;
      existing.status = existing.previousStatus;
      existing.previousStatus = undefined;
      await existing.save();
      results.success.push(id);
    } catch (error) {
      results.failed.push({ id, reason: error.message });
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      message: "Bulk restore completed",
      successCount: results.success.length,
      failedCount: results.failed.length,
      failed: results.failed,
    },
  };
}

async function bulkHardDeleteImages(ids) {
  const results = { success: [], failed: [] };

  for (const id of ids) {
    try {
      const entity = await Image.findById(id);
      if (!entity) {
        results.failed.push({ id, reason: "Not found" });
        continue;
      }
      if (!entity.softDelete) {
        results.failed.push({ id, reason: "Only soft deleted images can be permanently deleted" });
        continue;
      }
      performImageHardDelete(entity).catch((error) => {
        logger.error(`ASYNC_BULK_DELETE_FAILED | imageId=${maskId(id)} | error=${error.message}`);
      });
      results.success.push(id);
    } catch (error) {
      results.failed.push({ id, reason: error.message });
    }
  }

  return {
    status: 202,
    body: {
      success: true,
      message: "Bulk hard delete initiated",
      successCount: results.success.length,
      failedCount: results.failed.length,
      failed: results.failed,
    },
  };
}

module.exports = {
  batchDeleteByFestivalId,
  batchUpload,
  bulkSoftDeleteImages,
  bulkRestoreImages,
  bulkHardDeleteImages,
  bulkRestoreImages,
  bulkHardDeleteImages,
  getByFestivalId,
  getById,
  getByOrientation,
  getBySoftDelete,
  getByStatus,
  getByUserTypeAccess,
  hardDeleteImage,
  incrementDownload,
  incrementLike,
  incrementView,
  reorderImages,
  restoreImage,
  softDeleteImage,
  updateStatus,
  updateUserTypeAccess,
};
