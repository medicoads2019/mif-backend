const ClientFrame = require("../models/clientFrame.model");
const cloudinary = require("../config/cloudinary");
const logger = require("../utils/logger");
const { Readable } = require("stream");
const axios = require("axios");
const crypto = require("crypto");
const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT || 8058}`);

const CLIENTFRAMEIMAGE_SERVICE_URL =
  process.env.CLIENTFRAMEIMAGE_SERVICE_URL || BACKEND_BASE_URL;

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
      folder: "ClientFrameOriginal",
      resource_type: "image",
      use_filename: true,
      unique_filename: true,
    }),
    streamUpload(buffer, {
      folder: "ClientFrameThumbnail",
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

exports.createClientFrame = async (
  clientFrameName,
  createdBy,
  uploadedBy,
  file,
) => {
  const exists = await ClientFrame.findOne({ clientFrameName });
  if (exists)
    return {
      status: 409,
      body: { success: false, message: "ClientFrame name already exists" },
    };

  let code = generateCode();
  let codeExists = await ClientFrame.findOne({ clientFrameCode: code });
  while (codeExists) {
    code = generateCode();
    codeExists = await ClientFrame.findOne({ clientFrameCode: code });
  }

  const clientFrame = await ClientFrame.create({
    clientFrameName,
    clientFrameCode: code,
    createdBy,
    uploadedBy,
  });

  if (file) {
    setImmediate(async () => {
      try {
        const uploadResult = await uploadCoverImage(file.buffer);
        await ClientFrame.findByIdAndUpdate(clientFrame._id, {
          ...uploadResult,
          $push: { updatedAt: new Date() },
        });
        logger.info(
          `Cover image uploaded for clientFrameId=${clientFrame._id}`,
        );
      } catch (err) {
        logger.error(`Async cover upload failed: ${err.message}`);
      }
    });
    return {
      status: 202,
      body: {
        success: true,
        message: "ClientFrame created; image uploading",
        data: clientFrame,
      },
    };
  }

  return {
    status: 201,
    body: { success: true, message: "ClientFrame created", data: clientFrame },
  };
};

exports.addImageToClientFrame = async (clientFrameId, imageId) => {
  const clientFrame = await ClientFrame.findByIdAndUpdate(
    clientFrameId,
    { $addToSet: { imageIds: imageId }, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!clientFrame)
    return {
      status: 404,
      body: { success: false, message: "ClientFrame not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "Image added to clientFrame",
      data: clientFrame,
    },
  };
};

exports.removeImageFromClientFrame = async (clientFrameId, imageId) => {
  const clientFrame = await ClientFrame.findByIdAndUpdate(
    clientFrameId,
    { $pull: { imageIds: imageId }, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!clientFrame)
    return {
      status: 404,
      body: { success: false, message: "ClientFrame not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "Image removed from clientFrame",
      data: clientFrame,
    },
  };
};

exports.getAllClientFrames = async () => {
  const clientFrames = await ClientFrame.find({ softDelete: false });
  return { status: 200, body: { success: true, data: clientFrames } };
};

exports.getById = async (clientFrameId) => {
  const clientFrame = await ClientFrame.findById(clientFrameId);
  if (!clientFrame)
    return {
      status: 404,
      body: { success: false, message: "ClientFrame not found" },
    };
  return { status: 200, body: { success: true, data: clientFrame } };
};

exports.getByCode = async (code) => {
  const clientFrame = await ClientFrame.findOne({
    clientFrameCode: code.toUpperCase(),
    softDelete: false,
  });
  if (!clientFrame)
    return {
      status: 404,
      body: { success: false, message: "ClientFrame not found" },
    };
  return { status: 200, body: { success: true, data: clientFrame } };
};

exports.getByStatus = async (status) => {
  const clientFrames = await ClientFrame.find({
    clientFrameStatus: status,
    softDelete: false,
  });
  return { status: 200, body: { success: true, data: clientFrames } };
};

exports.getBySoftDelete = async (value) => {
  const clientFrames = await ClientFrame.find({ softDelete: value });
  return { status: 200, body: { success: true, data: clientFrames } };
};

exports.getPublishedClientFrames = async () => {
  const clientFrames = await ClientFrame.find({
    clientFrameStatus: "APPROVED",
    softDelete: false,
  });
  return { status: 200, body: { success: true, data: clientFrames } };
};

exports.updateCoverImage = async (clientFrameId, file) => {
  const clientFrame = await ClientFrame.findById(clientFrameId);
  if (!clientFrame)
    return {
      status: 404,
      body: { success: false, message: "ClientFrame not found" },
    };

  setImmediate(async () => {
    try {
      if (clientFrame.coverOriginalPublicId) {
        await Promise.all([
          cloudinary.uploader.destroy(clientFrame.coverOriginalPublicId),
          cloudinary.uploader.destroy(clientFrame.coverThumbnailPublicId),
        ]);
      }
      const uploadResult = await uploadCoverImage(file.buffer);
      await ClientFrame.findByIdAndUpdate(clientFrameId, {
        ...uploadResult,
        $push: { updatedAt: new Date() },
      });
      logger.info(`Cover image updated for clientFrameId=${clientFrameId}`);
    } catch (err) {
      logger.error(`Async cover update failed: ${err.message}`);
    }
  });

  return {
    status: 202,
    body: { success: true, message: "Cover image update in progress" },
  };
};

exports.updateClientFrameName = async (clientFrameId, clientFrameName) => {
  const exists = await ClientFrame.findOne({
    clientFrameName,
    _id: { $ne: clientFrameId },
  });
  if (exists)
    return {
      status: 409,
      body: { success: false, message: "ClientFrame name already exists" },
    };
  const clientFrame = await ClientFrame.findByIdAndUpdate(
    clientFrameId,
    { clientFrameName, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!clientFrame)
    return {
      status: 404,
      body: { success: false, message: "ClientFrame not found" },
    };
  return {
    status: 200,
    body: {
      success: true,
      message: "ClientFrame name updated",
      data: clientFrame,
    },
  };
};

exports.updateStatus = async (clientFrameId, status) => {
  const clientFrame = await ClientFrame.findById(clientFrameId);
  if (!clientFrame)
    return {
      status: 404,
      body: { success: false, message: "ClientFrame not found" },
    };
  const update = {
    previousStatus: clientFrame.clientFrameStatus,
    clientFrameStatus: status,
    $push: { updatedAt: new Date() },
  };
  if (status === "APPROVED") update.publishedAt = new Date();
  const updated = await ClientFrame.findByIdAndUpdate(clientFrameId, update, {
    new: true,
  });
  return {
    status: 200,
    body: { success: true, message: "Status updated", data: updated },
  };
};

exports.softDelete = async (clientFrameId) => {
  const clientFrame = await ClientFrame.findById(clientFrameId);
  if (!clientFrame)
    return {
      status: 404,
      body: { success: false, message: "ClientFrame not found" },
    };
  const updated = await ClientFrame.findByIdAndUpdate(
    clientFrameId,
    {
      softDelete: true,
      previousStatus: clientFrame.clientFrameStatus,
      clientFrameStatus: "DELETED",
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );
  return {
    status: 200,
    body: { success: true, message: "ClientFrame soft-deleted", data: updated },
  };
};

exports.restore = async (clientFrameId) => {
  const clientFrame = await ClientFrame.findById(clientFrameId);
  if (!clientFrame)
    return {
      status: 404,
      body: { success: false, message: "ClientFrame not found" },
    };
  const updated = await ClientFrame.findByIdAndUpdate(
    clientFrameId,
    {
      softDelete: false,
      clientFrameStatus: clientFrame.previousStatus || "PENDING",
      previousStatus: null,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );
  return {
    status: 200,
    body: { success: true, message: "ClientFrame restored", data: updated },
  };
};

exports.hardDelete = async (clientFrameId) => {
  const clientFrame = await ClientFrame.findById(clientFrameId);
  if (!clientFrame)
    return {
      status: 404,
      body: { success: false, message: "ClientFrame not found" },
    };
  if (clientFrame.coverOriginalPublicId) {
    await Promise.all([
      cloudinary.uploader.destroy(clientFrame.coverOriginalPublicId),
      cloudinary.uploader.destroy(clientFrame.coverThumbnailPublicId),
    ]);
  }
  await ClientFrame.findByIdAndDelete(clientFrameId);
  axios
    .delete(
      `${CLIENTFRAMEIMAGE_SERVICE_URL}/client-frame-images/by-client-frame/${clientFrameId}`,
    )
    .catch((err) =>
      logger.warn(
        `BATCH_IMAGE_DELETE_FAILED | clientFrameId=${clientFrameId} | error=${err.message}`,
      ),
    );
  return {
    status: 200,
    body: { success: true, message: "ClientFrame permanently deleted" },
  };
};
