const Image = require("../models/image.model");
const cloudinary = require("../config/cloudinary");
const logger = require("../utils/logger");
const axios = require("axios");
const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT || 8058}`);

const CATEGORY_SERVICE_URL =
  process.env.CATEGORY_SERVICE_URL || BACKEND_BASE_URL;

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

function mapToResponse(e) {
  return {
    id: e._id.toString(),
    categoryId: e.categoryId,
    imageUrl: e.imageUrl,
    thumbnailUrl: e.thumbnailUrl,
    originalPublicId: e.originalPublicId,
    thumbnailPublicId: e.thumbnailPublicId,
    orderIndex: e.orderIndex,
    orientation: e.orientation,
    viewCount: e.viewCount,
    likeCount: e.likeCount,
    downloadCount: e.downloadCount,
    userTypeAccess: e.userTypeAccess,
    status: e.status,
    softDelete: e.softDelete,
    createdBy: e.createdBy,
    uploadedBy: e.uploadedBy,
    createdAt: e.createdAt,
    publishedAt: e.publishedAt,
  };
}

async function batchUpload(categoryId, createdBy, uploadedBy, files) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=batchUpload | categoryId=${maskId(categoryId)} | fileCount=${files ? files.length : 0}`,
  );

  if (!categoryId || !categoryId.trim())
    throw new Error("CategoryId is required");
  if (!files || files.length === 0) throw new Error("Files cannot be empty");

  const success = [];
  const failures = [];

  for (const file of files) {
    const fileName = file.originalname;
    try {
      if (!file.buffer || file.buffer.length === 0)
        throw new Error("File is empty");

      const [original, thumb] = await Promise.all([
        uploadToCloudinary(file.buffer, { folder: "CategoryImageOriginal" }),
        uploadToCloudinary(file.buffer, {
          folder: "CategoryImageThumbnail",
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

      const count = await Image.countDocuments({ categoryId });
      const entity = new Image({
        categoryId,
        imageUrl: original.secure_url,
        thumbnailUrl: thumb.secure_url,
        originalPublicId: original.public_id,
        thumbnailPublicId: thumb.public_id,
        orderIndex: count + 1,
        createdBy,
        uploadedBy,
      });
      const saved = await entity.save();

      // notify category service
      try {
        await axios.post(
          `${CATEGORY_SERVICE_URL}/categorys/${categoryId}/images`,
          { imageId: saved._id.toString() },
        );
      } catch (ex) {
        logger.warn(
          `EXTERNAL_CALL_FAILED | service=CategoryService | imageId=${maskId(saved._id.toString())} | error=${ex.message}`,
        );
      }

      success.push(mapToResponse(saved));
    } catch (e) {
      logger.error(`UPLOAD_FAILED | file=${fileName} | error=${e.message}`);
      failures.push({ file: fileName, error: "Upload failed" });
    }
  }

  logger.info(
    `SERVICE_COMPLETE | operation=batchUpload | success=${success.length} | failed=${failures.length} | durationMs=${Date.now() - start}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      total: files.length,
      uploaded: success.length,
      failed: failures.length,
      images: success,
      failures,
    },
  };
}

async function getById(id) {
  const entity = await Image.findById(id);
  if (!entity)
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };
  return { status: 200, body: { success: true, data: mapToResponse(entity) } };
}

async function getByStatus(status) {
  const images = await Image.find({ status, softDelete: { $ne: true } }).sort({
    orderIndex: 1,
  });
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
  const query =
    softDelete === true
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
  const images = await Image.find({
    userTypeAccess,
    softDelete: { $ne: true },
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

async function getByOrientation(orientation) {
  const images = await Image.find({
    orientation,
    softDelete: { $ne: true },
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

async function getByCategoryId(categoryId) {
  const images = await Image.find({ categoryId }).sort({ orderIndex: 1 });
  const activeImages = images
    .filter((img) => !img.softDelete)
    .map(mapToResponse);
  const deletedImages = images
    .filter((img) => img.softDelete)
    .map(mapToResponse);
  return {
    status: 200,
    body: {
      success: true,
      activeImages,
      deletedImages,
    },
  };
}

async function incrementView(id) {
  const image = await Image.findOneAndUpdate(
    { _id: id, softDelete: { $ne: true } },
    { $inc: { viewCount: 1 } },
    { new: true },
  );
  if (!image)
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "View count incremented",
      viewCount: image.viewCount,
    },
  };
}

async function incrementLike(id) {
  const image = await Image.findOneAndUpdate(
    { _id: id, softDelete: { $ne: true } },
    { $inc: { likeCount: 1 } },
    { new: true },
  );
  if (!image)
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "Like count incremented",
      likeCount: image.likeCount,
    },
  };
}

async function incrementDownload(id) {
  const image = await Image.findOneAndUpdate(
    { _id: id, softDelete: { $ne: true } },
    { $inc: { downloadCount: 1 } },
    { new: true },
  );
  if (!image)
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "Download count incremented",
      downloadCount: image.downloadCount,
    },
  };
}

async function updateUserTypeAccess(id, userTypeAccess) {
  const image = await Image.findOneAndUpdate(
    { _id: id, softDelete: { $ne: true } },
    { userTypeAccess },
    { new: true },
  );
  if (!image)
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "User type access updated",
      data: mapToResponse(image),
    },
  };
}

async function updateStatus(id, status) {
  const image = await Image.findOneAndUpdate(
    { _id: id, softDelete: { $ne: true } },
    { status, ...(status === "APPROVED" ? { publishedAt: new Date() } : {}) },
    { new: true },
  );
  if (!image)
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "Image status updated",
      data: mapToResponse(image),
    },
  };
}

async function softDeleteImage(id) {
  const image = await Image.findOneAndUpdate(
    { _id: id, softDelete: { $ne: true } },
    { softDelete: true, status: "DELETED" },
    { new: true },
  );
  if (!image)
    return {
      status: 404,
      body: { success: false, message: "Image not found or already deleted" },
    };
  return {
    status: 200,
    body: { success: true, message: "Image soft deleted" },
  };
}

async function restoreImage(id) {
  const image = await Image.findOneAndUpdate(
    { _id: id, softDelete: true },
    { softDelete: false, status: "PENDING" },
    { new: true },
  );
  if (!image)
    return {
      status: 404,
      body: { success: false, message: "Image not found or not soft deleted" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "Image restored",
      data: mapToResponse(image),
    },
  };
}

async function reorderImages(items) {
  const ops = items.map((item) =>
    Image.updateOne({ _id: item.imageId }, { orderIndex: item.orderIndex }),
  );
  await Promise.all(ops);
  return { status: 200, body: { success: true, message: "Images reordered" } };
}

async function hardDeleteImage(id) {
  const entity = await Image.findById(id);
  if (!entity)
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };

  if (entity.originalPublicId)
    await cloudinary.uploader.destroy(entity.originalPublicId).catch(() => {});
  if (entity.thumbnailPublicId)
    await cloudinary.uploader.destroy(entity.thumbnailPublicId).catch(() => {});
  await Image.deleteOne({ _id: id });

  // notify category service to remove imageId
  try {
    await axios.delete(
      `${CATEGORY_SERVICE_URL}/categorys/${entity.categoryId}/images/${id}`,
    );
  } catch (ex) {
    logger.warn(
      `EXTERNAL_CALL_FAILED | service=CategoryService | imageId=${maskId(id)} | error=${ex.message}`,
    );
  }

  return {
    status: 200,
    body: { success: true, message: "Image permanently deleted" },
  };
}

async function batchDeleteByCategoryId(categoryId) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=batchDeleteByCategoryId | categoryId=${maskId(categoryId)}`,
  );

  const images = await Image.find({ categoryId });

  // Return 202 immediately — background process does the actual deletion
  processBatchDeleteByCategoryId(images, categoryId).catch((err) => {
    logger.error(
      `ASYNC_BATCH_DELETE_FAILED | categoryId=${maskId(categoryId)} | error=${err.message}`,
    );
  });

  logger.info(
    `SERVICE_COMPLETE | operation=batchDeleteByCategoryId | imageCount=${images.length} | durationMs=${Date.now() - start}`,
  );
  return {
    status: 202,
    body: {
      success: true,
      message: "Batch delete initiated",
      count: images.length,
    },
  };
}

async function processBatchDeleteByCategoryId(images, categoryId) {
  logger.info(
    `ASYNC_BATCH_DELETE_START | categoryId=${maskId(categoryId)} | imageCount=${images.length}`,
  );

  for (const entity of images) {
    const id = entity._id.toString();
    try {
      if (entity.originalPublicId)
        await cloudinary.uploader
          .destroy(entity.originalPublicId)
          .catch(() => {});
      if (entity.thumbnailPublicId)
        await cloudinary.uploader
          .destroy(entity.thumbnailPublicId)
          .catch(() => {});
      await Image.deleteOne({ _id: id });
      logger.info(`BATCH_DELETE_IMAGE_SUCCESS | imageId=${maskId(id)}`);
    } catch (err) {
      logger.error(
        `BATCH_DELETE_IMAGE_FAILED | imageId=${maskId(id)} | error=${err.message}`,
      );
    }
  }

  logger.info(`ASYNC_BATCH_DELETE_COMPLETE | categoryId=${maskId(categoryId)}`);
}

module.exports = {
  batchDeleteByCategoryId,
  batchUpload,
  getById,
  getByStatus,
  getBySoftDelete,
  getByUserTypeAccess,
  getByOrientation,
  getByCategoryId,
  incrementView,
  incrementLike,
  incrementDownload,
  updateUserTypeAccess,
  updateStatus,
  softDeleteImage,
  restoreImage,
  reorderImages,
  hardDeleteImage,
};
