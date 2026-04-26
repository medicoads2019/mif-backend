const Banner = require("../models/banner.model");
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

const uploadBannerImage = async (buffer, originalName) => {
  const [original, thumbnail] = await Promise.all([
    streamUpload(buffer, {
      folder: "BannerOriginal",
      resource_type: "image",
      use_filename: true,
      unique_filename: true,
    }),
    streamUpload(buffer, {
      folder: "BannerThumbnail",
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

exports.createBanner = async (bannerName, createdBy, uploadedBy, file) => {
  const exists = await Banner.findOne({ bannerName });
  if (exists)
    return {
      status: 409,
      body: { success: false, message: "Banner name already exists" },
    };

  const count = await Banner.countDocuments();
  const banner = await Banner.create({
    bannerName,
    orderIndex: count,
    createdBy,
    uploadedBy,
  });

  if (file) {
    setImmediate(async () => {
      try {
        const uploadResult = await uploadBannerImage(
          file.buffer,
          file.originalname,
        );
        await Banner.findByIdAndUpdate(banner._id, {
          ...uploadResult,
          $push: { updatedAt: new Date() },
        });
        logger.info(`Banner image uploaded for bannerId=${banner._id}`);
      } catch (err) {
        logger.error(`Async banner image upload failed: ${err.message}`);
      }
    });
    return {
      status: 202,
      body: {
        success: true,
        message: "Banner created; image uploading",
        data: banner,
      },
    };
  }

  return {
    status: 201,
    body: { success: true, message: "Banner created", data: banner },
  };
};

exports.getAllBanners = async () => {
  const banners = await Banner.find({ softDelete: false }).sort({
    orderIndex: 1,
  });
  return { status: 200, body: { success: true, data: banners } };
};

exports.getById = async (bannerId) => {
  const banner = await Banner.findById(bannerId);
  if (!banner)
    return {
      status: 404,
      body: { success: false, message: "Banner not found" },
    };
  return { status: 200, body: { success: true, data: banner } };
};

exports.getByStatus = async (status) => {
  const banners = await Banner.find({
    bannerStatus: status,
    softDelete: false,
  });
  return { status: 200, body: { success: true, data: banners } };
};

exports.getBySoftDelete = async (value) => {
  const banners = await Banner.find({ softDelete: value });
  return { status: 200, body: { success: true, data: banners } };
};

exports.getCarouselBanners = async () => {
  const banners = await Banner.find({
    showInCarousel: true,
    softDelete: false,
    bannerStatus: "APPROVED",
  }).sort({ orderIndex: 1 });
  return { status: 200, body: { success: true, data: banners } };
};

exports.getPublishedBanners = async () => {
  const banners = await Banner.find({
    bannerStatus: "APPROVED",
    softDelete: false,
  }).sort({ orderIndex: 1 });
  return { status: 200, body: { success: true, data: banners } };
};

exports.searchBanners = async (name) => {
  const banners = await Banner.find({
    bannerName: { $regex: name, $options: "i" },
    softDelete: false,
  }).sort({ orderIndex: 1 });
  return { status: 200, body: { success: true, data: banners } };
};

exports.updateBannerImage = async (bannerId, file) => {
  const banner = await Banner.findById(bannerId);
  if (!banner)
    return {
      status: 404,
      body: { success: false, message: "Banner not found" },
    };

  setImmediate(async () => {
    try {
      if (banner.coverOriginalPublicId) {
        await cloudinary.uploader.destroy(banner.coverOriginalPublicId);
        await cloudinary.uploader.destroy(banner.coverThumbnailPublicId);
      }
      const uploadResult = await uploadBannerImage(
        file.buffer,
        file.originalname,
      );
      await Banner.findByIdAndUpdate(bannerId, {
        ...uploadResult,
        $push: { updatedAt: new Date() },
      });
      logger.info(`Banner image updated for bannerId=${bannerId}`);
    } catch (err) {
      logger.error(`Async banner image update failed: ${err.message}`);
    }
  });

  return {
    status: 202,
    body: { success: true, message: "Banner image update in progress" },
  };
};

exports.updateBannerName = async (bannerId, bannerName) => {
  const exists = await Banner.findOne({ bannerName, _id: { $ne: bannerId } });
  if (exists)
    return {
      status: 409,
      body: { success: false, message: "Banner name already exists" },
    };
  const banner = await Banner.findByIdAndUpdate(
    bannerId,
    { bannerName, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!banner)
    return {
      status: 404,
      body: { success: false, message: "Banner not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "Banner name updated", data: banner },
  };
};

exports.updateStatus = async (bannerId, status) => {
  const banner = await Banner.findById(bannerId);
  if (!banner)
    return {
      status: 404,
      body: { success: false, message: "Banner not found" },
    };
  const update = {
    previousStatus: banner.bannerStatus,
    bannerStatus: status,
    $push: { updatedAt: new Date() },
  };
  if (status === "APPROVED") update.publishedAt = new Date();
  const updated = await Banner.findByIdAndUpdate(bannerId, update, {
    new: true,
  });
  return {
    status: 200,
    body: { success: true, message: "Status updated", data: updated },
  };
};

exports.updateCarousel = async (bannerId, value) => {
  const banner = await Banner.findByIdAndUpdate(
    bannerId,
    { showInCarousel: value, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!banner)
    return {
      status: 404,
      body: { success: false, message: "Banner not found" },
    };
  return {
    status: 200,
    body: { success: true, message: "Carousel updated", data: banner },
  };
};

exports.reorderBanners = async (items) => {
  const ops = items.map(({ bannerId, orderIndex }) =>
    Banner.findByIdAndUpdate(bannerId, {
      orderIndex,
      $push: { updatedAt: new Date() },
    }),
  );
  await Promise.all(ops);
  return { status: 200, body: { success: true, message: "Banners reordered" } };
};

exports.softDelete = async (bannerId) => {
  const banner = await Banner.findById(bannerId);
  if (!banner)
    return {
      status: 404,
      body: { success: false, message: "Banner not found" },
    };
  const updated = await Banner.findByIdAndUpdate(
    bannerId,
    {
      softDelete: true,
      previousStatus: banner.bannerStatus,
      bannerStatus: "DELETED",
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );
  return {
    status: 200,
    body: { success: true, message: "Banner soft-deleted", data: updated },
  };
};

exports.restore = async (bannerId) => {
  const banner = await Banner.findById(bannerId);
  if (!banner)
    return {
      status: 404,
      body: { success: false, message: "Banner not found" },
    };
  const updated = await Banner.findByIdAndUpdate(
    bannerId,
    {
      softDelete: false,
      bannerStatus: banner.previousStatus || "PENDING",
      previousStatus: null,
      $push: { updatedAt: new Date() },
    },
    { new: true },
  );
  return {
    status: 200,
    body: { success: true, message: "Banner restored", data: updated },
  };
};

exports.hardDelete = async (bannerId) => {
  const banner = await Banner.findById(bannerId);
  if (!banner)
    return {
      status: 404,
      body: { success: false, message: "Banner not found" },
    };
  if (banner.coverOriginalPublicId) {
    await Promise.all([
      cloudinary.uploader.destroy(banner.coverOriginalPublicId),
      cloudinary.uploader.destroy(banner.coverThumbnailPublicId),
    ]);
  }
  await Banner.findByIdAndDelete(bannerId);
  return {
    status: 200,
    body: { success: true, message: "Banner permanently deleted" },
  };
};

exports.updateCreatedBy = async (bannerId, createdBy) => {
  const banner = await Banner.findByIdAndUpdate(
    bannerId,
    { createdBy, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!banner)
    return { status: 404, body: { success: false, message: "Banner not found" } };
  return { status: 200, body: { success: true, message: "Banner createdBy updated", data: banner } };
};

exports.updateUploadedBy = async (bannerId, uploadedBy) => {
  const banner = await Banner.findByIdAndUpdate(
    bannerId,
    { uploadedBy, $push: { updatedAt: new Date() } },
    { new: true },
  );
  if (!banner)
    return { status: 404, body: { success: false, message: "Banner not found" } };
  return { status: 200, body: { success: true, message: "Banner uploadedBy updated", data: banner } };
};
