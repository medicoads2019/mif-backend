const BusinessFrame = require("../models/businessFrame.model");
const cloudinary = require("../config/cloudinary");
const logger = require("../utils/logger");
const { Readable } = require("stream");
const crypto = require("crypto");
const axios = require("axios");
const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT || 8058}`);

const BUSINESSFRAMEIMAGE_SERVICE_URL =
  process.env.BUSINESSFRAMEIMAGE_SERVICE_URL || BACKEND_BASE_URL;

const generateCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();

const streamUpload = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });

const uploadCoverImage = async (buffer) => {
  const [original, thumbnail] = await Promise.all([
    streamUpload(buffer, {
      folder: "BusinessFrameOriginal",
      resource_type: "image",
      use_filename: true,
      unique_filename: true,
    }),
    streamUpload(buffer, {
      folder: "BusinessFrameThumbnail",
      resource_type: "image",
      transformation: [{ width: 400, height: 400, crop: "limit", quality: 80 }],
    }),
  ]);
  return {
    coverImageUrl: original.secure_url,
    coverThumbnailUrl: thumbnail.secure_url,
    coverOriginalPublicId: original.public_id,
    coverThumbnailPublicId: thumbnail.public_id,
  };
};

exports.createBusinessFrame = async (
  businessFrameName,
  createdBy,
  uploadedBy,
  file,
) => {
  const exists = await BusinessFrame.findOne({ businessFrameName });
  if (exists)
    return {
      status: 409,
      body: { success: false, message: "BusinessFrame name already exists" },
    };

  let code = generateCode();
  let codeExists = await BusinessFrame.findOne({ businessFrameCode: code });
  while (codeExists) {
    code = generateCode();
    codeExists = await BusinessFrame.findOne({ businessFrameCode: code });
  }

  const businessFrame = await BusinessFrame.create({
    businessFrameName,
    businessFrameCode: code,
    createdBy,
    uploadedBy,
  });

  if (file) {
    setImmediate(async () => {
      try {
        const uploadResult = await uploadCoverImage(file.buffer);
        await BusinessFrame.findByIdAndUpdate(businessFrame._id, {
          ...uploadResult,
          $push: { updatedAt: new Date() },
        });
        logger.info(
          `Cover image uploaded for businessFrameId=${businessFrame._id}`,
        );
      } catch (err) {
        logger.error(`Async cover upload failed: ${err.message}`);
      }
    });
    return {
      status: 202,
      body: {
        success: true,
        message: "BusinessFrame created; image uploading",
        data: businessFrame,
      },
    };
  }

  return {
    status: 201,
    body: {
      success: true,
      message: "BusinessFrame created",
      data: businessFrame,
    },
  };
};

exports.addImageToBusinessFrame = async (businessFrameId, imageId) => {
  const businessFrame = await BusinessFrame.findByIdAndUpdate(
    businessFrameId,
    { $addToSet: { imageIds: imageId }, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!businessFrame)
    return {
      status: 404,
      body: { success: false, message: "BusinessFrame not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "Image added to businessFrame",
      data: businessFrame,
    },
  };
};

exports.removeImageFromBusinessFrame = async (businessFrameId, imageId) => {
  const businessFrame = await BusinessFrame.findByIdAndUpdate(
    businessFrameId,
    { $pull: { imageIds: imageId }, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!businessFrame)
    return {
      status: 404,
      body: { success: false, message: "BusinessFrame not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "Image removed from businessFrame",
      data: businessFrame,
    },
  };
};

exports.getAllBusinessFrames = async () => {
  const businessFrames = await BusinessFrame.find({ softDelete: false });
  return { status: 200, body: { success: true, data: businessFrames } };
};

exports.getById = async (businessFrameId) => {
  const businessFrame = await BusinessFrame.findById(businessFrameId);
  if (!businessFrame)
    return {
      status: 404,
      body: { success: false, message: "BusinessFrame not found" },
    };
  return { status: 200, body: { success: true, data: businessFrame } };
};

exports.getByCode = async (code) => {
  const businessFrame = await BusinessFrame.findOne({
    businessFrameCode: code.toUpperCase(),
    softDelete: false,
  });
  if (!businessFrame)
    return {
      status: 404,
      body: { success: false, message: "BusinessFrame not found" },
    };
  return { status: 200, body: { success: true, data: businessFrame } };
};

exports.getByStatus = async (status) => {
  const businessFrames = await BusinessFrame.find({
    businessFrameStatus: status,
    softDelete: false,
  });
  return { status: 200, body: { success: true, data: businessFrames } };
};

exports.getBySoftDelete = async (value) => {
  const businessFrames = await BusinessFrame.find({ softDelete: value });
  return { status: 200, body: { success: true, data: businessFrames } };
};

exports.getPublishedBusinessFrames = async () => {
  const businessFrames = await BusinessFrame.find({
    businessFrameStatus: "APPROVED",
    softDelete: false,
  });
  return { status: 200, body: { success: true, data: businessFrames } };
};

exports.updateCoverImage = async (businessFrameId, file) => {
  const businessFrame = await BusinessFrame.findById(businessFrameId);
  if (!businessFrame)
    return {
      status: 404,
      body: { success: false, message: "BusinessFrame not found" },
    };

  setImmediate(async () => {
    try {
      if (businessFrame.coverOriginalPublicId) {
        await Promise.all([
          cloudinary.uploader.destroy(businessFrame.coverOriginalPublicId),
          cloudinary.uploader.destroy(businessFrame.coverThumbnailPublicId),
        ]);
      }
      const uploadResult = await uploadCoverImage(file.buffer);
      await BusinessFrame.findByIdAndUpdate(businessFrameId, {
        ...uploadResult,
        $push: { updatedAt: new Date() },
      });
      logger.info(`Cover image updated for businessFrameId=${businessFrameId}`);
    } catch (err) {
      logger.error(`Async cover update failed: ${err.message}`);
    }
  });

  return {
    status: 202,
    body: { success: true, message: "Cover image update in progress" },
  };
};

exports.updateBusinessFrameName = async (
  businessFrameId,
  businessFrameName,
) => {
  const exists = await BusinessFrame.findOne({
    businessFrameName,
    _id: { $ne: businessFrameId },
  });
  if (exists)
    return {
      status: 409,
      body: { success: false, message: "BusinessFrame name already exists" },
    };
  const businessFrame = await BusinessFrame.findByIdAndUpdate(
    businessFrameId,
    { businessFrameName, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!businessFrame)
    return {
      status: 404,
      body: { success: false, message: "BusinessFrame not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "BusinessFrame name updated",
      data: businessFrame,
    },
  };
};

exports.updateBusinessFrameCode = async (
  businessFrameId,
  businessFrameCode,
) => {
  const exists = await BusinessFrame.findOne({
    businessFrameCode,
    _id: { $ne: businessFrameId },
  });
  if (exists)
    return {
      status: 409,
      body: { success: false, message: "BusinessFrame code already exists" },
    };
  const businessFrame = await BusinessFrame.findByIdAndUpdate(
    businessFrameId,
    { businessFrameCode, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!businessFrame)
    return {
      status: 404,
      body: { success: false, message: "BusinessFrame not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "BusinessFrame code updated",
      data: businessFrame,
    },
  };
};

exports.updateStatus = async (businessFrameId, status) => {
  const businessFrame = await BusinessFrame.findById(businessFrameId);
  if (!businessFrame)
    return {
      status: 404,
      body: { success: false, message: "BusinessFrame not found" },
    };
  const update = {
    previousStatus: businessFrame.businessFrameStatus,
    businessFrameStatus: status,
    $push: { updatedAt: new Date() },
  };
  if (status === "APPROVED") update.publishedAt = new Date();
  const updated = await BusinessFrame.findByIdAndUpdate(
    businessFrameId,
    update,
    { new: true },
  );
  return {
    status: 200,
    body: { success: true, message: "Status updated", data: updated },
  };
};

exports.softDelete = async (businessFrameId) => {
  const businessFrame = await BusinessFrame.findById(businessFrameId);
  if (!businessFrame)
    return {
      status: 404,
      body: { success: false, message: "BusinessFrame not found" },
    };
  const updated = await BusinessFrame.findByIdAndUpdate(
    businessFrameId,
    {
      softDelete: true,
      previousStatus: businessFrame.businessFrameStatus,
      businessFrameStatus: "DELETED",
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );
  return {
    status: 200,
    body: {
      success: true,
      message: "BusinessFrame soft-deleted",
      data: updated,
    },
  };
};

exports.restore = async (businessFrameId) => {
  const businessFrame = await BusinessFrame.findById(businessFrameId);
  if (!businessFrame)
    return {
      status: 404,
      body: { success: false, message: "BusinessFrame not found" },
    };
  const updated = await BusinessFrame.findByIdAndUpdate(
    businessFrameId,
    {
      softDelete: false,
      businessFrameStatus: businessFrame.previousStatus || "PENDING",
      previousStatus: null,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );
  return {
    status: 200,
    body: { success: true, message: "BusinessFrame restored", data: updated },
  };
};

exports.hardDelete = async (businessFrameId) => {
  const businessFrame = await BusinessFrame.findById(businessFrameId);
  if (!businessFrame)
    return {
      status: 404,
      body: { success: false, message: "BusinessFrame not found" },
    };
  if (businessFrame.coverOriginalPublicId) {
    await Promise.all([
      cloudinary.uploader.destroy(businessFrame.coverOriginalPublicId),
      cloudinary.uploader.destroy(businessFrame.coverThumbnailPublicId),
    ]);
  }
  await BusinessFrame.findByIdAndDelete(businessFrameId);
  axios
    .delete(
      `${BUSINESSFRAMEIMAGE_SERVICE_URL}/business-frame-images/by-business-frame/${businessFrameId}`,
    )
    .catch((err) =>
      logger.warn(
        `BATCH_IMAGE_DELETE_FAILED | businessFrameId=${businessFrameId} | error=${err.message}`,
      ),
    );
  return {
    status: 200,
    body: { success: true, message: "BusinessFrame permanently deleted" },
  };
};

exports.updateCreatedBy = async (businessFrameId, createdBy) => {
  const bf = await BusinessFrame.findByIdAndUpdate(
    businessFrameId,
    { createdBy, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!bf)
    return { status: 404, body: { success: false, message: "BusinessFrame not found" } };
  return { status: 200, body: { success: true, message: "BusinessFrame createdBy updated", data: bf } };
};

exports.updateUploadedBy = async (businessFrameId, uploadedBy) => {
  const bf = await BusinessFrame.findByIdAndUpdate(
    businessFrameId,
    { uploadedBy, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!bf)
    return { status: 404, body: { success: false, message: "BusinessFrame not found" } };
  return { status: 200, body: { success: true, message: "BusinessFrame uploadedBy updated", data: bf } };
};
