const Category = require("../models/category.model");
const cloudinary = require("../config/cloudinary");
const logger = require("../utils/logger");
const axios = require("axios");
const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT || 8058}`);
const CATEGORYIMAGE_SERVICE_URL =
  process.env.CATEGORYIMAGE_SERVICE_URL || BACKEND_BASE_URL;

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
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function mapToResponse(entity) {
  return {
    categoryId: entity._id.toString(),
    categoryName: entity.categoryName,
    categoryDate: formatIsoDate(entity.categoryDate),
    imageIds: entity.imageIds || [],
    coverImageUrl: entity.coverImageUrl || null,
    coverThumbnailUrl: entity.coverThumbnailUrl || null,
    coverOriginalPublicId: entity.coverOriginalPublicId || null,
    coverThumbnailPublicId: entity.coverThumbnailPublicId || null,
    categoryStatus: entity.categoryStatus,
    previousStatus: entity.previousStatus || null,
    orderIndex: entity.orderIndex ?? 0,
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

async function createCategory(
  categoryName,
  categoryDate,
  createdBy,
  uploadedBy,
  file,
) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=createCategory | categoryName=${categoryName}`,
  );

  const exists = await Category.findOne({ categoryName });
  if (exists) {
    logger.warn(`DUPLICATE_CATEGORY | categoryName=${categoryName}`);
    return {
      status: 400,
      body: { success: false, message: "Category already exists" },
    };
  }

  processCategoryCreation(
    categoryName,
    categoryDate,
    createdBy,
    uploadedBy,
    file,
  ).catch((err) => {
    logger.error(
      `ASYNC_FAILED | categoryName=${categoryName} | exceptionType=${err.constructor.name}`,
    );
  });

  logger.info(
    `SERVICE_COMPLETE | operation=createCategory | durationMs=${Date.now() - start}`,
  );
  return {
    status: 202,
    body: { success: true, message: "Category creation initiated" },
  };
}

async function processCategoryCreation(
  categoryName,
  categoryDate,
  createdBy,
  uploadedBy,
  file,
) {
  logger.info(`ASYNC_START | categoryName=${categoryName}`);

  const [original, thumb] = await Promise.all([
    uploadToCloudinary(file.buffer, { folder: "CategoryCoverOriginal" }),
    uploadToCloudinary(file.buffer, {
      folder: "CategoryCoverThumbnail",
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

  const category = new Category({
    categoryName,
    categoryDate,
    coverImageUrl: original.secure_url,
    coverThumbnailUrl: thumb.secure_url,
    coverOriginalPublicId: original.public_id,
    coverThumbnailPublicId: thumb.public_id,
    createdBy,
    uploadedBy,
  });

  const saved = await category.save();
  logger.info(`ASYNC_SUCCESS | categoryId=${maskId(saved._id.toString())}`);
}

async function addImageToCategory(categoryId, imageId) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=addImageToCategory | categoryId=${maskId(categoryId)} | imageId=${maskId(imageId)}`,
  );

  const result = await Category.updateOne(
    { _id: categoryId, softDelete: { $ne: true }, imageIds: { $ne: imageId } },
    { $addToSet: { imageIds: imageId } },
  );

  if (result.matchedCount === 0) {
    const categoryExists = await Category.exists({
      _id: categoryId,
      softDelete: { $ne: true },
    });
    if (!categoryExists) {
      logger.warn(
        `ADD_FAILED | categoryId=${maskId(categoryId)} | reason=notFoundOrSoftDeleted`,
      );
      return {
        status: 404,
        body: { success: false, message: "Category not found or soft deleted" },
      };
    }
    logger.warn(
      `ADD_SKIPPED | categoryId=${maskId(categoryId)} | reason=imageAlreadyPresent`,
    );
    return {
      status: 200,
      body: {
        success: true,
        message: "Image already associated with category",
      },
    };
  }

  logger.info(
    `IMAGE_ADDED_SUCCESS | categoryId=${maskId(categoryId)} | imageId=${maskId(imageId)} | durationMs=${Date.now() - start}`,
  );
  return {
    status: 200,
    body: { success: true, message: "Image added to category successfully" },
  };
}

async function getAllCategorys() {
  logger.info("SERVICE_START | operation=getAllCategorys");
  const categorys = await Category.find({ softDelete: { $ne: true } }).sort({
    orderIndex: 1,
    createdAt: -1,
  });
  logger.info(
    `DB_QUERY_SUCCESS | operation=getAllCategorys | resultCount=${categorys.length}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      count: categorys.length,
      data: categorys.map(mapToResponse),
    },
  };
}

async function getById(categoryId) {
  logger.info(
    `SERVICE_START | operation=getById | categoryId=${maskId(categoryId)}`,
  );
  const entity = await Category.findById(categoryId);
  if (!entity) {
    logger.warn(
      `DB_QUERY_NOT_FOUND | operation=getById | categoryId=${maskId(categoryId)}`,
    );
    return {
      status: 404,
      body: { success: false, message: "Category not found" },
    };
  }
  logger.info(
    `DB_QUERY_SUCCESS | operation=getById | categoryId=${maskId(categoryId)}`,
  );
  return { status: 200, body: { success: true, data: mapToResponse(entity) } };
}

async function getByStatus(status) {
  logger.info(`SERVICE_START | operation=getByStatus | status=${status}`);
  const categorys = await Category.find({
    categoryStatus: status,
    softDelete: { $ne: true },
  }).sort({ createdAt: -1 });
  logger.info(
    `DB_QUERY_SUCCESS | operation=getByStatus | resultCount=${categorys.length}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      count: categorys.length,
      data: categorys.map(mapToResponse),
    },
  };
}

async function getBySoftDelete(softDelete) {
  logger.info(
    `SERVICE_START | operation=getBySoftDelete | value=${softDelete}`,
  );
  const query =
    softDelete === true
      ? { softDelete: true }
      : { $or: [{ softDelete: false }, { softDelete: null }] };
  const categorys = await Category.find(query).sort({ createdAt: -1 });
  logger.info(
    `DB_QUERY_SUCCESS | operation=getBySoftDelete | resultCount=${categorys.length}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      count: categorys.length,
      data: categorys.map(mapToResponse),
    },
  };
}

async function getPublishedCategorys() {
  logger.info("SERVICE_START | operation=getPublishedCategorys");
  const categorys = await Category.find({
    categoryStatus: "APPROVED",
    publishedAt: { $ne: null },
    softDelete: { $ne: true },
  }).sort({ createdAt: -1 });
  logger.info(
    `DB_QUERY_SUCCESS | operation=getPublishedCategorys | resultCount=${categorys.length}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      count: categorys.length,
      data: categorys.map(mapToResponse),
    },
  };
}

async function searchByCategoryName(name) {
  logger.info(`SERVICE_START | operation=searchByCategoryName | name=${name}`);
  const categorys = await Category.find({
    categoryName: { $regex: name, $options: "i" },
    softDelete: { $ne: true },
  }).sort({ createdAt: -1 });
  logger.info(
    `DB_QUERY_SUCCESS | operation=searchByCategoryName | resultCount=${categorys.length}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      count: categorys.length,
      data: categorys.map(mapToResponse),
    },
  };
}

async function updateCategoryCoverImage(categoryId, file) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=updateCategoryCoverImage | categoryId=${maskId(categoryId)}`,
  );

  const category = await Category.findOne({
    _id: categoryId,
    softDelete: { $ne: true },
  });
  if (!category) {
    logger.warn(
      `UPDATE_FAILED | categoryId=${maskId(categoryId)} | reason=notFoundOrSoftDeleted`,
    );
    return {
      status: 404,
      body: { success: false, message: "Category not found or soft deleted" },
    };
  }

  if (category.coverOriginalPublicId) {
    await cloudinary.uploader
      .destroy(category.coverOriginalPublicId)
      .catch(() => {});
  }
  if (category.coverThumbnailPublicId) {
    await cloudinary.uploader
      .destroy(category.coverThumbnailPublicId)
      .catch(() => {});
  }

  const [original, thumb] = await Promise.all([
    uploadToCloudinary(file.buffer, { folder: "CategoryCoverOriginal" }),
    uploadToCloudinary(file.buffer, {
      folder: "CategoryCoverThumbnail",
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

  category.coverImageUrl = original.secure_url;
  category.coverThumbnailUrl = thumb.secure_url;
  category.coverOriginalPublicId = original.public_id;
  category.coverThumbnailPublicId = thumb.public_id;
  await category.save();

  logger.info(
    `CATEGORY_IMAGE_UPDATED | categoryId=${maskId(categoryId)} | durationMs=${Date.now() - start}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      message: "Category cover image updated successfully",
      data: mapToResponse(category),
    },
  };
}

async function updateStatus(categoryId, newStatus) {
  const start = Date.now();
  logger.info(
    `SERVICE_START | operation=updateStatus | categoryId=${maskId(categoryId)}`,
  );

  const category = await Category.findOne({
    _id: categoryId,
    softDelete: { $ne: true },
  });
  if (!category) {
    logger.warn(
      `UPDATE_FAILED | categoryId=${maskId(categoryId)} | reason=notFoundOrSoftDeleted`,
    );
    return {
      status: 404,
      body: { success: false, message: "Category not found or soft deleted" },
    };
  }

  if (category.categoryStatus === newStatus) {
    return {
      status: 200,
      body: {
        success: true,
        message: "Status already set",
        data: mapToResponse(category),
      },
    };
  }

  category.previousStatus = category.categoryStatus;
  category.categoryStatus = newStatus;
  if (newStatus === "APPROVED" && !category.publishedAt) {
    category.publishedAt = new Date();
  }
  await category.save();

  logger.info(
    `STATUS_UPDATED | categoryId=${maskId(categoryId)} | newStatus=${newStatus} | durationMs=${Date.now() - start}`,
  );
  return {
    status: 200,
    body: {
      success: true,
      message: "Category status updated",
      data: mapToResponse(category),
    },
  };
}

async function updateCategoryName(categoryId, categoryName) {
  logger.info(
    `SERVICE_START | operation=updateCategoryName | categoryId=${maskId(categoryId)}`,
  );

  const category = await Category.findOne({
    _id: categoryId,
    softDelete: { $ne: true },
  });
  if (!category) {
    return {
      status: 404,
      body: { success: false, message: "Category not found or soft deleted" },
    };
  }

  const duplicate = await Category.findOne({
    categoryName,
    _id: { $ne: categoryId },
  });
  if (duplicate) {
    return {
      status: 400,
      body: { success: false, message: "Category name already exists" },
    };
  }

  category.categoryName = categoryName;
  await category.save();
  return {
    status: 200,
    body: {
      success: true,
      message: "Category name updated",
      data: mapToResponse(category),
    },
  };
}

async function updateCategoryDate(categoryId, categoryDate) {
  logger.info(
    `SERVICE_START | operation=updateCategoryDate | categoryId=${maskId(categoryId)}`,
  );

  const category = await Category.findOne({
    _id: categoryId,
    softDelete: { $ne: true },
  });
  if (!category) {
    return {
      status: 404,
      body: { success: false, message: "Category not found or soft deleted" },
    };
  }

  category.categoryDate = categoryDate;
  await category.save();
  return {
    status: 200,
    body: {
      success: true,
      message: "Category date updated",
      data: mapToResponse(category),
    },
  };
}

async function addImagePatch(categoryId, imageId) {
  return addImageToCategory(categoryId, imageId);
}

async function removeImageFromCategory(categoryId, imageId) {
  logger.info(
    `SERVICE_START | operation=removeImageFromCategory | categoryId=${maskId(categoryId)} | imageId=${maskId(imageId)}`,
  );

  const result = await Category.updateOne(
    { _id: categoryId, softDelete: { $ne: true } },
    { $pull: { imageIds: imageId } },
  );

  if (result.matchedCount === 0) {
    return {
      status: 404,
      body: { success: false, message: "Category not found or soft deleted" },
    };
  }
  return {
    status: 200,
    body: { success: true, message: "Image removed from category" },
  };
}

async function softDelete(categoryId) {
  logger.info(
    `SERVICE_START | operation=softDelete | categoryId=${maskId(categoryId)}`,
  );

  const category = await Category.findOne({
    _id: categoryId,
    softDelete: { $ne: true },
  });
  if (!category) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Category not found or already soft deleted",
      },
    };
  }

  category.previousStatus = category.categoryStatus;
  category.categoryStatus = "DELETED";
  category.softDelete = true;
  await category.save();
  return {
    status: 200,
    body: { success: true, message: "Category soft deleted" },
  };
}

async function restore(categoryId) {
  logger.info(
    `SERVICE_START | operation=restore | categoryId=${maskId(categoryId)}`,
  );

  const category = await Category.findOne({
    _id: categoryId,
    softDelete: true,
  });
  if (!category) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Category not found or not soft deleted",
      },
    };
  }

  category.categoryStatus = category.previousStatus || "PENDING";
  category.previousStatus = null;
  category.softDelete = false;
  await category.save();
  return {
    status: 200,
    body: {
      success: true,
      message: "Category restored",
      data: mapToResponse(category),
    },
  };
}

async function hardDelete(categoryId) {
  logger.info(
    `SERVICE_START | operation=hardDelete | categoryId=${maskId(categoryId)}`,
  );

  const category = await Category.findById(categoryId);
  if (!category) {
    return {
      status: 404,
      body: { success: false, message: "Category not found" },
    };
  }

  if (category.coverOriginalPublicId) {
    await cloudinary.uploader
      .destroy(category.coverOriginalPublicId)
      .catch(() => {});
  }
  if (category.coverThumbnailPublicId) {
    await cloudinary.uploader
      .destroy(category.coverThumbnailPublicId)
      .catch(() => {});
  }

  await Category.deleteOne({ _id: categoryId });
  axios
    .delete(
      `${CATEGORYIMAGE_SERVICE_URL}/categoryimages/by-category/${categoryId}`,
    )
    .catch((err) =>
      logger.warn(
        `BATCH_IMAGE_DELETE_FAILED | categoryId=${maskId(categoryId)} | error=${err.message}`,
      ),
    );
  logger.info(`HARD_DELETE_SUCCESS | categoryId=${maskId(categoryId)}`);
  return {
    status: 200,
    body: { success: true, message: "Category permanently deleted" },
  };
}

async function reorderCategorys(items) {
  const ops = items.map(({ categoryId, orderIndex }) =>
    Category.findByIdAndUpdate(categoryId, {
      orderIndex,
      $push: { updatedAt: new Date() },
    }),
  );
  await Promise.all(ops);
  return {
    status: 200,
    body: { success: true, message: "Categorys reordered" },
  };
}

async function updateCategoryCreatedBy(categoryId, createdBy) {
  const category = await Category.findOne({
    _id: categoryId,
    softDelete: { $ne: true },
  });
  if (!category) {
    return {
      status: 404,
      body: { success: false, message: "Category not found or soft deleted" },
    };
  }
  category.createdBy = createdBy;
  await category.save();
  return {
    status: 200,
    body: {
      success: true,
      message: "Category createdBy updated",
      data: mapToResponse(category),
    },
  };
}

async function updateCategoryUploadedBy(categoryId, uploadedBy) {
  const category = await Category.findOne({
    _id: categoryId,
    softDelete: { $ne: true },
  });
  if (!category) {
    return {
      status: 404,
      body: { success: false, message: "Category not found or soft deleted" },
    };
  }
  category.uploadedBy = uploadedBy;
  await category.save();
  return {
    status: 200,
    body: {
      success: true,
      message: "Category uploadedBy updated",
      data: mapToResponse(category),
    },
  };
}

module.exports = {
  parseDdMmYyyy,
  createCategory,
  addImageToCategory,
  getAllCategorys,
  getById,
  getByStatus,
  getBySoftDelete,
  getPublishedCategorys,
  searchByCategoryName,
  updateCategoryCoverImage,
  updateStatus,
  updateCategoryName,
  updateCategoryDate,
  updateCategoryCreatedBy,
  updateCategoryUploadedBy,
  addImagePatch,
  removeImageFromCategory,
  softDelete,
  restore,
  hardDelete,
  reorderCategorys,
};
