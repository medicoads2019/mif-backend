const BusinessFrameImage = require("../models/image.model");
const cloudinary = require("../config/cloudinary");
const logger = require("../utils/logger");
const axios = require("axios");
const { Readable } = require("stream");
const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT || 8058}`);

const BUSINESS_FRAME_SERVICE_URL =
  process.env.BUSINESS_FRAME_SERVICE_URL || BACKEND_BASE_URL;

const maskId = (id = "") =>
  id.length > 8 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id;

const streamUpload = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });

const uploadImageToCloudinary = async (buffer) => {
  const [original, thumbnail] = await Promise.all([
    streamUpload(buffer, {
      folder: "BusinessFrameImageOriginal",
      resource_type: "image",
      use_filename: true,
      unique_filename: true,
    }),
    streamUpload(buffer, {
      folder: "BusinessFrameImageThumbnail",
      resource_type: "image",
      transformation: [{ width: 400, height: 400, crop: "limit", quality: 80 }],
    }),
  ]);
  return {
    imageUrl: original.secure_url,
    thumbnailUrl: thumbnail.secure_url,
    originalPublicId: original.public_id,
    thumbnailPublicId: thumbnail.public_id,
  };
};

exports.batchUpload = async (businessFrameId, createdBy, uploadedBy, files) => {
  if (!businessFrameId) throw new Error("BusinessFrameId is required");
  if (!files || files.length === 0) throw new Error("Files cannot be empty");

  const success = [];
  const failures = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = file.originalname || `file-${i}`;
    try {
      if (!file.buffer || file.buffer.length === 0)
        throw new Error("File is empty");

      const uploadResult = await uploadImageToCloudinary(file.buffer);
      const count = await BusinessFrameImage.countDocuments({
        businessFrameId,
      });

      const entity = await BusinessFrameImage.create({
        businessFrameId,
        ...uploadResult,
        orderIndex: count,
        createdBy,
        uploadedBy,
      });

      // Notify businessFrame service so imageIds are saved immediately
      await axios
        .post(
          `${BUSINESS_FRAME_SERVICE_URL}/business-frames/${businessFrameId}/images`,
          { imageId: entity._id.toString() },
        )
        .catch((err) =>
          logger.warn(`Failed to notify businessFrame service: ${err.message}`),
        );

      logger.info(
        `Image uploaded and businessFrame notified: imageId=${entity._id}`,
      );
      success.push(entity);
    } catch (err) {
      logger.error(`UPLOAD_FAILED | file=${fileName} | error=${err.message}`);
      failures.push({ file: fileName, error: "Upload failed" });
    }
  }

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
};

exports.getById = async (id) => {
  const image = await BusinessFrameImage.findById(id);
  if (!image)
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };
  return { status: 200, body: { success: true, data: image } };
};

exports.getByStatus = async (status) => {
  const images = await BusinessFrameImage.find({ status, softDelete: false });
  return { status: 200, body: { success: true, data: images } };
};

exports.getBySoftDelete = async (value) => {
  const images = await BusinessFrameImage.find({ softDelete: value });
  return { status: 200, body: { success: true, data: images } };
};

exports.getByUserTypeAccess = async (userTypeAccess) => {
  const images = await BusinessFrameImage.find({
    userTypeAccess,
    softDelete: false,
  });
  return { status: 200, body: { success: true, data: images } };
};

exports.getByOrientation = async (orientation) => {
  const images = await BusinessFrameImage.find({
    orientation,
    softDelete: false,
  });
  return { status: 200, body: { success: true, data: images } };
};

exports.getByBusinessFrameId = async (businessFrameId) => {
  const images = await BusinessFrameImage.find({ businessFrameId }).sort({
    orderIndex: 1,
  });
  const activeImages = images.filter((img) => !img.softDelete);
  const deletedImages = images.filter((img) => img.softDelete);
  return {
    status: 200,
    body: { success: true, activeImages, deletedImages },
  };
};

exports.updateUserTypeAccess = async (id, userTypeAccess) => {
  const image = await BusinessFrameImage.findByIdAndUpdate(
    id,
    { userTypeAccess, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!image)
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "User type access updated", data: image },
  };
};

exports.updateStatus = async (id, status) => {
  const image = await BusinessFrameImage.findById(id);
  if (!image)
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };
  const update = {
    previousStatus: image.status,
    status,
    $push: { updatedAt: new Date() },
  };
  if (status === "APPROVED") update.publishedAt = new Date();
  const updated = await BusinessFrameImage.findByIdAndUpdate(id, update, {
    new: true,
  });
  return {
    status: 200,
    body: { success: true, message: "Status updated", data: updated },
  };
};

exports.softDeleteImage = async (id) => {
  const image = await BusinessFrameImage.findById(id);
  if (!image)
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };
  const updated = await BusinessFrameImage.findByIdAndUpdate(
    id,
    {
      softDelete: true,
      previousStatus: image.status,
      status: "DELETED",
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );
  return {
    status: 200,
    body: { success: true, message: "Image soft-deleted", data: updated },
  };
};

exports.restoreImage = async (id) => {
  const image = await BusinessFrameImage.findById(id);
  if (!image)
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };
  const updated = await BusinessFrameImage.findByIdAndUpdate(
    id,
    {
      softDelete: false,
      status: image.previousStatus || "PENDING",
      previousStatus: null,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );
  return {
    status: 200,
    body: { success: true, message: "Image restored", data: updated },
  };
};

exports.reorderImages = async (items) => {
  const ops = items.map(({ imageId, orderIndex }) =>
    BusinessFrameImage.findByIdAndUpdate(imageId, {
      orderIndex,
      $push: { updatedAt: new Date() },
    }),
  );
  await Promise.all(ops);
  return { status: 200, body: { success: true, message: "Images reordered" } };
};

exports.batchDeleteByBusinessFrameId = async (businessFrameId) => {
  logger.info(
    `SERVICE_START | operation=batchDeleteByBusinessFrameId | businessFrameId=${maskId(businessFrameId)}`,
  );

  const images = await BusinessFrameImage.find({ businessFrameId });

  processBatchDeleteByBusinessFrameId(images, businessFrameId).catch((err) => {
    logger.error(
      `ASYNC_BATCH_DELETE_FAILED | businessFrameId=${maskId(businessFrameId)} | error=${err.message}`,
    );
  });

  logger.info(
    `SERVICE_COMPLETE | operation=batchDeleteByBusinessFrameId | imageCount=${images.length}`,
  );
  return {
    status: 202,
    body: {
      success: true,
      message: "Batch delete initiated",
      count: images.length,
    },
  };
};

async function processBatchDeleteByBusinessFrameId(images, businessFrameId) {
  logger.info(
    `ASYNC_BATCH_DELETE_START | businessFrameId=${maskId(businessFrameId)} | imageCount=${images.length}`,
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
      await BusinessFrameImage.deleteOne({ _id: id });
      logger.info(`BATCH_DELETE_IMAGE_SUCCESS | imageId=${maskId(id)}`);
    } catch (err) {
      logger.error(
        `BATCH_DELETE_IMAGE_FAILED | imageId=${maskId(id)} | error=${err.message}`,
      );
    }
  }

  logger.info(
    `ASYNC_BATCH_DELETE_COMPLETE | businessFrameId=${maskId(businessFrameId)}`,
  );
}

exports.hardDeleteImage = async (id) => {
  const image = await BusinessFrameImage.findById(id);
  if (!image)
    return {
      status: 404,
      body: { success: false, message: "Image not found" },
    };

  if (image.originalPublicId) {
    await Promise.all([
      cloudinary.uploader.destroy(image.originalPublicId),
      cloudinary.uploader.destroy(image.thumbnailPublicId),
    ]);
  }

  await axios
    .delete(
      `${BUSINESS_FRAME_SERVICE_URL}/business-frames/${image.businessFrameId}/images/${id}`,
    )
    .catch((err) =>
      logger.warn(
        `Failed to notify businessFrame service on delete: ${err.message}`,
      ),
    );

  await BusinessFrameImage.findByIdAndDelete(id);
  return {
    status: 200,
    body: { success: true, message: "Image permanently deleted" },
  };
};
