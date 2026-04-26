const DemoFrame = require("../models/demoFrame.model");
const cloudinary = require("../config/cloudinary");
const logger = require("../utils/logger");
const { Readable } = require("stream");

const streamUpload = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });

const uploadDemoFrameImage = async (buffer) => {
  const [original, thumbnail] = await Promise.all([
    streamUpload(buffer, {
      folder: "DemoFrameOriginal",
      resource_type: "image",
      use_filename: true,
      unique_filename: true,
    }),
    streamUpload(buffer, {
      folder: "DemoFrameThumbnail",
      resource_type: "image",
      transformation: [
        { width: 1200, height: 400, crop: "limit", quality: 20 },
      ],
    }),
  ]);
  return {
    imageUrl: original.secure_url,
    thumbnailUrl: thumbnail.secure_url,
    coverOriginalPublicId: original.public_id,
    coverThumbnailPublicId: thumbnail.public_id,
  };
};

exports.createDemoFrame = async (
  demoFrameName,
  createdBy,
  uploadedBy,
  file,
) => {
  const exists = await DemoFrame.findOne({ demoFrameName });
  if (exists)
    return {
      status: 409,
      body: { success: false, message: "DemoFrame name already exists" },
    };

  const count = await DemoFrame.countDocuments();
  const demoFrame = await DemoFrame.create({
    demoFrameName,
    orderIndex: count,
    createdBy,
    uploadedBy,
  });

  if (file) {
    setImmediate(async () => {
      try {
        const uploadResult = await uploadDemoFrameImage(file.buffer);
        await DemoFrame.findByIdAndUpdate(demoFrame._id, {
          ...uploadResult,
          $push: { updatedAt: new Date() },
        });
        logger.info(
          `DemoFrame image uploaded for demoFrameId=${demoFrame._id}`,
        );
      } catch (err) {
        logger.error(`Async demoFrame image upload failed: ${err.message}`);
      }
    });
    return {
      status: 202,
      body: {
        success: true,
        message: "DemoFrame created; image uploading",
        data: demoFrame,
      },
    };
  }

  return {
    status: 201,
    body: { success: true, message: "DemoFrame created", data: demoFrame },
  };
};

exports.getAllDemoFrames = async () => {
  const demoFrames = await DemoFrame.find({ softDelete: false }).sort({
    orderIndex: 1,
  });
  return { status: 200, body: { success: true, data: demoFrames } };
};

exports.getById = async (demoFrameId) => {
  const demoFrame = await DemoFrame.findById(demoFrameId);
  if (!demoFrame)
    return {
      status: 404,
      body: { success: false, message: "DemoFrame not found" },
    };
  return { status: 200, body: { success: true, data: demoFrame } };
};

exports.getByStatus = async (status) => {
  const demoFrames = await DemoFrame.find({
    demoFrameStatus: status,
    softDelete: false,
  });
  return { status: 200, body: { success: true, data: demoFrames } };
};

exports.getBySoftDelete = async (value) => {
  const demoFrames = await DemoFrame.find({ softDelete: value });
  return { status: 200, body: { success: true, data: demoFrames } };
};

exports.getCarouselDemoFrames = async () => {
  const demoFrames = await DemoFrame.find({
    showInCarousel: true,
    softDelete: false,
    demoFrameStatus: "APPROVED",
  }).sort({ orderIndex: 1 });
  return { status: 200, body: { success: true, data: demoFrames } };
};

exports.getPublishedDemoFrames = async () => {
  const demoFrames = await DemoFrame.find({
    demoFrameStatus: "APPROVED",
    softDelete: false,
  }).sort({ orderIndex: 1 });
  return { status: 200, body: { success: true, data: demoFrames } };
};

exports.searchDemoFrames = async (name) => {
  const demoFrames = await DemoFrame.find({
    demoFrameName: { $regex: name, $options: "i" },
    softDelete: false,
  }).sort({ orderIndex: 1 });
  return { status: 200, body: { success: true, data: demoFrames } };
};

exports.updateDemoFrameImage = async (demoFrameId, file) => {
  const demoFrame = await DemoFrame.findById(demoFrameId);
  if (!demoFrame)
    return {
      status: 404,
      body: { success: false, message: "DemoFrame not found" },
    };

  setImmediate(async () => {
    try {
      if (demoFrame.coverOriginalPublicId) {
        await Promise.all([
          cloudinary.uploader.destroy(demoFrame.coverOriginalPublicId),
          cloudinary.uploader.destroy(demoFrame.coverThumbnailPublicId),
        ]);
      }
      const uploadResult = await uploadDemoFrameImage(file.buffer);
      await DemoFrame.findByIdAndUpdate(demoFrameId, {
        ...uploadResult,
        $push: { updatedAt: new Date() },
      });
      logger.info(`DemoFrame image updated for demoFrameId=${demoFrameId}`);
    } catch (err) {
      logger.error(`Async demoFrame image update failed: ${err.message}`);
    }
  });

  return {
    status: 202,
    body: { success: true, message: "DemoFrame image update in progress" },
  };
};

exports.updateDemoFrameName = async (demoFrameId, demoFrameName) => {
  const exists = await DemoFrame.findOne({
    demoFrameName,
    _id: { $ne: demoFrameId },
  });
  if (exists)
    return {
      status: 409,
      body: { success: false, message: "DemoFrame name already exists" },
    };
  const demoFrame = await DemoFrame.findByIdAndUpdate(
    demoFrameId,
    { demoFrameName, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!demoFrame)
    return {
      status: 404,
      body: { success: false, message: "DemoFrame not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "DemoFrame name updated", data: demoFrame },
  };
};

exports.updateStatus = async (demoFrameId, status) => {
  const demoFrame = await DemoFrame.findById(demoFrameId);
  if (!demoFrame)
    return {
      status: 404,
      body: { success: false, message: "DemoFrame not found" },
    };
  const update = {
    previousStatus: demoFrame.demoFrameStatus,
    demoFrameStatus: status,
    $push: { updatedAt: new Date() },
  };
  if (status === "APPROVED") update.publishedAt = new Date();
  const updated = await DemoFrame.findByIdAndUpdate(demoFrameId, update, {
    new: true,
  });
  return {
    status: 200,
    body: { success: true, message: "Status updated", data: updated },
  };
};

exports.updateCarousel = async (demoFrameId, value) => {
  const demoFrame = await DemoFrame.findByIdAndUpdate(
    demoFrameId,
    { showInCarousel: value, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!demoFrame)
    return {
      status: 404,
      body: { success: false, message: "DemoFrame not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "Carousel updated", data: demoFrame },
  };
};

exports.reorderDemoFrames = async (items) => {
  const ops = items.map(({ demoFrameId, orderIndex }) =>
    DemoFrame.findByIdAndUpdate(demoFrameId, {
      orderIndex,
      $push: { updatedAt: new Date() },
    }),
  );
  await Promise.all(ops);
  return {
    status: 200,
    body: { success: true, message: "DemoFrames reordered" },
  };
};

exports.softDelete = async (demoFrameId) => {
  const demoFrame = await DemoFrame.findById(demoFrameId);
  if (!demoFrame)
    return {
      status: 404,
      body: { success: false, message: "DemoFrame not found" },
    };
  const updated = await DemoFrame.findByIdAndUpdate(
    demoFrameId,
    {
      softDelete: true,
      previousStatus: demoFrame.demoFrameStatus,
      demoFrameStatus: "DELETED",
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );
  return {
    status: 200,
    body: { success: true, message: "DemoFrame soft-deleted", data: updated },
  };
};

exports.restore = async (demoFrameId) => {
  const demoFrame = await DemoFrame.findById(demoFrameId);
  if (!demoFrame)
    return {
      status: 404,
      body: { success: false, message: "DemoFrame not found" },
    };
  const updated = await DemoFrame.findByIdAndUpdate(
    demoFrameId,
    {
      softDelete: false,
      demoFrameStatus: demoFrame.previousStatus || "PENDING",
      previousStatus: null,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );
  return {
    status: 200,
    body: { success: true, message: "DemoFrame restored", data: updated },
  };
};

exports.hardDelete = async (demoFrameId) => {
  const demoFrame = await DemoFrame.findById(demoFrameId);
  if (!demoFrame)
    return {
      status: 404,
      body: { success: false, message: "DemoFrame not found" },
    };
  if (demoFrame.coverOriginalPublicId) {
    await Promise.all([
      cloudinary.uploader.destroy(demoFrame.coverOriginalPublicId),
      cloudinary.uploader.destroy(demoFrame.coverThumbnailPublicId),
    ]);
  }
  await DemoFrame.findByIdAndDelete(demoFrameId);
  return {
    status: 200,
    body: { success: true, message: "DemoFrame permanently deleted" },
  };
};

exports.updateCreatedBy = async (demoFrameId, createdBy) => {
  const demoFrame = await DemoFrame.findByIdAndUpdate(
    demoFrameId,
    { createdBy, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!demoFrame)
    return { status: 404, body: { success: false, message: "DemoFrame not found" } };
  return { status: 200, body: { success: true, message: "DemoFrame createdBy updated", data: demoFrame } };
};

exports.updateUploadedBy = async (demoFrameId, uploadedBy) => {
  const demoFrame = await DemoFrame.findByIdAndUpdate(
    demoFrameId,
    { uploadedBy, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!demoFrame)
    return { status: 404, body: { success: false, message: "DemoFrame not found" } };
  return { status: 200, body: { success: true, message: "DemoFrame uploadedBy updated", data: demoFrame } };
};
