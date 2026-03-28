const StartScreenImage = require("../models/startScreenImage.model");
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

const uploadImage = async (buffer) => {
  const [original, thumbnail] = await Promise.all([
    streamUpload(buffer, {
      folder: "StartScreenImageOriginal",
      resource_type: "image",
      use_filename: true,
      unique_filename: true,
    }),
    streamUpload(buffer, {
      folder: "StartScreenImageThumbnail",
      resource_type: "image",
      transformation: [
        { width: 720, height: 1280, crop: "limit", quality: 70 },
      ],
    }),
  ]);
  return {
    imageUrl: original.secure_url,
    thumbnailUrl: thumbnail.secure_url,
    originalPublicId: original.public_id,
    thumbnailPublicId: thumbnail.public_id,
  };
};

exports.createStartScreenImage = async (imageName, createdBy, file) => {
  const exists = await StartScreenImage.findOne({ imageName });
  if (exists)
    return {
      status: 409,
      body: { success: false, message: "Image name already exists" },
    };

  const count = await StartScreenImage.countDocuments();
  const doc = await StartScreenImage.create({
    imageName,
    indexValue: count,
    createdBy,
  });

  if (file) {
    setImmediate(async () => {
      try {
        const uploadResult = await uploadImage(file.buffer);
        await StartScreenImage.findByIdAndUpdate(doc._id, {
          ...uploadResult,
          $push: { updatedAt: new Date() },
        });
        logger.info(`StartScreenImage uploaded for id=${doc._id}`);
      } catch (err) {
        logger.error(`Async startScreenImage upload failed: ${err.message}`);
      }
    });
    return {
      status: 202,
      body: {
        success: true,
        message: "Start screen image created; image uploading",
        data: doc,
      },
    };
  }

  return {
    status: 201,
    body: { success: true, message: "Start screen image created", data: doc },
  };
};

exports.getAll = async () => {
  const docs = await StartScreenImage.find({ softDelete: false }).sort({
    indexValue: 1,
  });
  return { status: 200, body: { success: true, data: docs } };
};

exports.getActiveForStartScreen = async () => {
  const docs = await StartScreenImage.find({
    softDelete: false,
    showInStartScreen: true,
    status: "ACTIVE",
    imageUrl: { $ne: null },
  }).sort({ indexValue: 1 });
  return { status: 200, body: { success: true, data: docs } };
};

exports.getById = async (id) => {
  const doc = await StartScreenImage.findById(id);
  if (!doc)
    return {
      status: 404,
      body: { success: false, message: "Start screen image not found" },
    };
  return { status: 200, body: { success: true, data: doc } };
};

exports.updateImage = async (id, file) => {
  const doc = await StartScreenImage.findById(id);
  if (!doc)
    return {
      status: 404,
      body: { success: false, message: "Start screen image not found" },
    };

  setImmediate(async () => {
    try {
      if (doc.originalPublicId) {
        await Promise.all([
          cloudinary.uploader.destroy(doc.originalPublicId),
          cloudinary.uploader.destroy(doc.thumbnailPublicId),
        ]);
      }
      const uploadResult = await uploadImage(file.buffer);
      await StartScreenImage.findByIdAndUpdate(id, {
        ...uploadResult,
        $push: { updatedAt: new Date() },
      });
      logger.info(`StartScreenImage image replaced for id=${id}`);
    } catch (err) {
      logger.error(
        `Async startScreenImage image replace failed: ${err.message}`,
      );
    }
  });

  return {
    status: 202,
    body: { success: true, message: "Image replacement in progress" },
  };
};

exports.updateName = async (id, imageName) => {
  const doc = await StartScreenImage.findByIdAndUpdate(
    id,
    { imageName, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!doc)
    return {
      status: 404,
      body: { success: false, message: "Start screen image not found" },
    };
  return { status: 200, body: { success: true, data: doc } };
};

exports.updateStatus = async (id, status) => {
  const doc = await StartScreenImage.findByIdAndUpdate(
    id,
    { status, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!doc)
    return {
      status: 404,
      body: { success: false, message: "Start screen image not found" },
    };
  return { status: 200, body: { success: true, data: doc } };
};

exports.updateShowInStartScreen = async (id, showInStartScreen) => {
  const doc = await StartScreenImage.findByIdAndUpdate(
    id,
    { showInStartScreen, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!doc)
    return {
      status: 404,
      body: { success: false, message: "Start screen image not found" },
    };
  return { status: 200, body: { success: true, data: doc } };
};

exports.reorder = async (orderedIds) => {
  const bulkOps = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { indexValue: index, $push: { updatedAt: new Date() } } },
    },
  }));
  // $push inside $set is not valid — use separate update
  const ops = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: { indexValue: index, $push: { updatedAt: new Date() } },
    },
  }));
  await StartScreenImage.bulkWrite(ops);
  const docs = await StartScreenImage.find({ softDelete: false }).sort({
    indexValue: 1,
  });
  return { status: 200, body: { success: true, data: docs } };
};

exports.softDelete = async (id) => {
  const doc = await StartScreenImage.findByIdAndUpdate(
    id,
    {
      softDelete: true,
      showInStartScreen: false,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );
  if (!doc)
    return {
      status: 404,
      body: { success: false, message: "Start screen image not found" },
    };
  return { status: 200, body: { success: true, data: doc } };
};

exports.restore = async (id) => {
  const doc = await StartScreenImage.findByIdAndUpdate(
    id,
    { softDelete: false, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!doc)
    return {
      status: 404,
      body: { success: false, message: "Start screen image not found" },
    };
  return { status: 200, body: { success: true, data: doc } };
};

exports.getBySoftDelete = async (value) => {
  const docs = await StartScreenImage.find({ softDelete: value }).sort({
    indexValue: 1,
  });
  return { status: 200, body: { success: true, data: docs } };
};

exports.hardDelete = async (id) => {
  const doc = await StartScreenImage.findById(id);
  if (!doc)
    return {
      status: 404,
      body: { success: false, message: "Start screen image not found" },
    };
  if (doc.originalPublicId) {
    await Promise.all([
      cloudinary.uploader.destroy(doc.originalPublicId),
      cloudinary.uploader.destroy(doc.thumbnailPublicId),
    ]);
  }
  await StartScreenImage.findByIdAndDelete(id);
  return {
    status: 200,
    body: { success: true, message: "Start screen image permanently deleted" },
  };
};
