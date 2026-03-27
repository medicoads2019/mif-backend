const Business = require("../models/business.model");
const cloudinary = require("../config/cloudinary");
const logger = require("../utils/logger");
const axios = require("axios");
const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT || 8058}`);
const BUSINESSIMAGE_SERVICE_URL =
  process.env.BUSINESSIMAGE_SERVICE_URL || BACKEND_BASE_URL;

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

function formatIsoDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function mapToResponse(entity) {
  return {
    businessId: entity._id.toString(),
    businessName: entity.businessName,
    businessDate: formatIsoDate(entity.businessDate),
    imageIds: entity.imageIds || [],
    coverImageUrl: entity.coverImageUrl || null,
    coverThumbnailUrl: entity.coverThumbnailUrl || null,
    coverOriginalPublicId: entity.coverOriginalPublicId || null,
    coverThumbnailPublicId: entity.coverThumbnailPublicId || null,
    businessStatus: entity.businessStatus,
    previousStatus: entity.previousStatus || null,
    softDelete: entity.softDelete,
    createdBy: entity.createdBy,
    uploadedBy: entity.uploadedBy,
    createdAt: entity.createdAt,
    publishedAt: entity.publishedAt || null,
  };
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

async function createBusiness(
  businessName,
  businessDate,
  createdBy,
  uploadedBy,
  file,
) {
  logger.info(
    `SERVICE_START | operation=createBusiness | businessName=${businessName}`,
  );
  const exists = await Business.findOne({ businessName });
  if (exists) {
    logger.warn(`DUPLICATE_BUSINESS | businessName=${businessName}`);
    return {
      status: 400,
      body: { success: false, message: "Business already exists" },
    };
  }
  processBusinessCreation(
    businessName,
    businessDate,
    createdBy,
    uploadedBy,
    file,
  ).catch((err) => {
    logger.error(
      `ASYNC_FAILED | businessName=${businessName} | exceptionType=${err.constructor.name}`,
    );
  });
  return {
    status: 202,
    body: { success: true, message: "Business creation initiated" },
  };
}

async function processBusinessCreation(
  businessName,
  businessDate,
  createdBy,
  uploadedBy,
  file,
) {
  logger.info(`ASYNC_START | businessName=${businessName}`);
  const [original, thumb] = await Promise.all([
    uploadToCloudinary(file.buffer, { folder: "BusinessCoverOriginal" }),
    uploadToCloudinary(file.buffer, {
      folder: "BusinessCoverThumbnail",
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
  const business = new Business({
    businessName,
    businessDate,
    coverImageUrl: original.secure_url,
    coverThumbnailUrl: thumb.secure_url,
    coverOriginalPublicId: original.public_id,
    coverThumbnailPublicId: thumb.public_id,
    createdBy,
    uploadedBy,
  });
  const saved = await business.save();
  logger.info(`ASYNC_SUCCESS | businessId=${maskId(saved._id.toString())}`);
}

async function addImageToBusiness(businessId, imageId) {
  logger.info(
    `SERVICE_START | operation=addImageToBusiness | businessId=${maskId(businessId)}`,
  );
  const result = await Business.updateOne(
    { _id: businessId, softDelete: { $ne: true }, imageIds: { $ne: imageId } },
    { $addToSet: { imageIds: imageId } },
  );
  if (result.matchedCount === 0) {
    const exists = await Business.exists({
      _id: businessId,
      softDelete: { $ne: true },
    });
    if (!exists)
      return {
        status: 404,
        body: { success: false, message: "Business not found or soft deleted" },
      };
    return {
      status: 200,
      body: {
        success: true,
        message: "Image already associated with business",
      },
    };
  }
  return {
    status: 200,
    body: { success: true, message: "Image added to business successfully" },
  };
}

async function getAllBusinesss() {
  const items = await Business.find({ softDelete: { $ne: true } }).sort({
    createdAt: -1,
  });
  return {
    status: 200,
    body: {
      success: true,
      count: items.length,
      data: items.map(mapToResponse),
    },
  };
}

async function getById(businessId) {
  const entity = await Business.findById(businessId);
  if (!entity)
    return {
      status: 404,
      body: { success: false, message: "Business not found" },
    };
  return { status: 200, body: { success: true, data: mapToResponse(entity) } };
}

async function getByStatus(status) {
  const items = await Business.find({
    businessStatus: status,
    softDelete: { $ne: true },
  }).sort({ createdAt: -1 });
  return {
    status: 200,
    body: {
      success: true,
      count: items.length,
      data: items.map(mapToResponse),
    },
  };
}

async function getBySoftDelete(softDelete) {
  const query =
    softDelete === true
      ? { softDelete: true }
      : { $or: [{ softDelete: false }, { softDelete: null }] };
  const items = await Business.find(query).sort({ createdAt: -1 });
  return {
    status: 200,
    body: {
      success: true,
      count: items.length,
      data: items.map(mapToResponse),
    },
  };
}

async function getPublishedBusinesss() {
  const items = await Business.find({
    businessStatus: "APPROVED",
    publishedAt: { $ne: null },
    softDelete: { $ne: true },
  }).sort({ createdAt: -1 });
  return {
    status: 200,
    body: {
      success: true,
      count: items.length,
      data: items.map(mapToResponse),
    },
  };
}

async function searchByBusinessName(name) {
  const items = await Business.find({
    businessName: { $regex: name, $options: "i" },
    softDelete: { $ne: true },
  }).sort({ createdAt: -1 });
  return {
    status: 200,
    body: {
      success: true,
      count: items.length,
      data: items.map(mapToResponse),
    },
  };
}

async function updateBusinessCoverImage(businessId, file) {
  const business = await Business.findOne({
    _id: businessId,
    softDelete: { $ne: true },
  });
  if (!business)
    return {
      status: 404,
      body: { success: false, message: "Business not found or soft deleted" },
    };
  if (business.coverOriginalPublicId)
    await cloudinary.uploader
      .destroy(business.coverOriginalPublicId)
      .catch(() => {});
  if (business.coverThumbnailPublicId)
    await cloudinary.uploader
      .destroy(business.coverThumbnailPublicId)
      .catch(() => {});
  const [original, thumb] = await Promise.all([
    uploadToCloudinary(file.buffer, { folder: "BusinessCoverOriginal" }),
    uploadToCloudinary(file.buffer, {
      folder: "BusinessCoverThumbnail",
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
  business.coverImageUrl = original.secure_url;
  business.coverThumbnailUrl = thumb.secure_url;
  business.coverOriginalPublicId = original.public_id;
  business.coverThumbnailPublicId = thumb.public_id;
  await business.save();
  return {
    status: 200,
    body: {
      success: true,
      message: "Business cover image updated",
      data: mapToResponse(business),
    },
  };
}

async function updateStatus(businessId, newStatus) {
  const business = await Business.findOne({
    _id: businessId,
    softDelete: { $ne: true },
  });
  if (!business)
    return {
      status: 404,
      body: { success: false, message: "Business not found or soft deleted" },
    };
  if (business.businessStatus === newStatus)
    return {
      status: 200,
      body: {
        success: true,
        message: "Status already set",
        data: mapToResponse(business),
      },
    };
  business.previousStatus = business.businessStatus;
  business.businessStatus = newStatus;
  if (newStatus === "APPROVED" && !business.publishedAt)
    business.publishedAt = new Date();
  await business.save();
  return {
    status: 200,
    body: {
      success: true,
      message: "Business status updated",
      data: mapToResponse(business),
    },
  };
}

async function updateBusinessName(businessId, businessName) {
  const business = await Business.findOne({
    _id: businessId,
    softDelete: { $ne: true },
  });
  if (!business)
    return {
      status: 404,
      body: { success: false, message: "Business not found or soft deleted" },
    };
  const dup = await Business.findOne({
    businessName,
    _id: { $ne: businessId },
  });
  if (dup)
    return {
      status: 400,
      body: { success: false, message: "Business name already exists" },
    };
  business.businessName = businessName;
  await business.save();
  return {
    status: 200,
    body: {
      success: true,
      message: "Business name updated",
      data: mapToResponse(business),
    },
  };
}

async function updateBusinessDate(businessId, businessDate) {
  const business = await Business.findOne({
    _id: businessId,
    softDelete: { $ne: true },
  });
  if (!business)
    return {
      status: 404,
      body: { success: false, message: "Business not found or soft deleted" },
    };
  business.businessDate = businessDate;
  await business.save();
  return {
    status: 200,
    body: {
      success: true,
      message: "Business date updated",
      data: mapToResponse(business),
    },
  };
}

async function removeImageFromBusiness(businessId, imageId) {
  const result = await Business.updateOne(
    { _id: businessId, softDelete: { $ne: true } },
    { $pull: { imageIds: imageId } },
  );
  if (result.matchedCount === 0)
    return {
      status: 404,
      body: { success: false, message: "Business not found or soft deleted" },
    };
  return {
    status: 200,
    body: { success: true, message: "Image removed from business" },
  };
}

async function softDelete(businessId) {
  const business = await Business.findOne({
    _id: businessId,
    softDelete: { $ne: true },
  });
  if (!business)
    return {
      status: 404,
      body: {
        success: false,
        message: "Business not found or already soft deleted",
      },
    };
  business.previousStatus = business.businessStatus;
  business.businessStatus = "DELETED";
  business.softDelete = true;
  await business.save();
  return {
    status: 200,
    body: { success: true, message: "Business soft deleted" },
  };
}

async function restore(businessId) {
  const business = await Business.findOne({
    _id: businessId,
    softDelete: true,
  });
  if (!business)
    return {
      status: 404,
      body: {
        success: false,
        message: "Business not found or not soft deleted",
      },
    };
  business.businessStatus = business.previousStatus || "PENDING";
  business.previousStatus = null;
  business.softDelete = false;
  await business.save();
  return {
    status: 200,
    body: {
      success: true,
      message: "Business restored",
      data: mapToResponse(business),
    },
  };
}

async function hardDelete(businessId) {
  const business = await Business.findById(businessId);
  if (!business)
    return {
      status: 404,
      body: { success: false, message: "Business not found" },
    };
  if (business.coverOriginalPublicId)
    await cloudinary.uploader
      .destroy(business.coverOriginalPublicId)
      .catch(() => {});
  if (business.coverThumbnailPublicId)
    await cloudinary.uploader
      .destroy(business.coverThumbnailPublicId)
      .catch(() => {});
  await Business.deleteOne({ _id: businessId });
  axios
    .delete(
      `${BUSINESSIMAGE_SERVICE_URL}/businessimages/by-business/${businessId}`,
    )
    .catch((err) =>
      logger.warn(
        `BATCH_IMAGE_DELETE_FAILED | businessId=${maskId(businessId)} | error=${err.message}`,
      ),
    );
  return {
    status: 200,
    body: { success: true, message: "Business permanently deleted" },
  };
}

module.exports = {
  parseDdMmYyyy,
  createBusiness,
  addImageToBusiness,
  getAllBusinesss,
  getById,
  getByStatus,
  getBySoftDelete,
  getPublishedBusinesss,
  searchByBusinessName,
  updateBusinessCoverImage,
  updateStatus,
  updateBusinessName,
  updateBusinessDate,
  removeImageFromBusiness,
  softDelete,
  restore,
  hardDelete,
};
