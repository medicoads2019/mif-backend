"use strict";

const axios = require("axios");
const sharp = require("sharp");
const DemoFrame = require("../../../demoframe/src/models/demoFrame.model");
const BusinessFrame = require("../../../businessFrame/src/models/businessFrame.model");
const BusinessFrameImage = require("../../../businessFrameImage/src/models/image.model");
const ClientFrame = require("../../../clientFrame/src/models/clientFrame.model");
const ClientFrameImage = require("../../../clientFrameImage/src/models/image.model");
const FestivalImage = require("../../../festivalImage/src/models/image.model");
const CategoryImage = require("../../../categoryImage/src/models/image.model");
const logger = require("../utils/logger");

/**
 * Resolve the full-resolution image URL of a frame by its MongoDB ObjectId.
 * Search order: DemoFrame -> BusinessFrame -> ClientFrame
 * Returns { imageUrl, frameType } or throws if not found.
 */
async function resolveFrameImageUrl(selectedFrameId) {
  // 1. Try DemoFrame
  try {
    const demoFrame = await DemoFrame.findById(selectedFrameId).lean();
    if (demoFrame) {
      if (!demoFrame.imageUrl) {
        throw new Error("DemoFrame found but imageUrl is not yet available");
      }
      logger.info(
        `resolveFrameImageUrl | found in DemoFrame | id=${selectedFrameId}`,
      );
      return { imageUrl: demoFrame.imageUrl, frameType: "DemoFrame" };
    }
  } catch (err) {
    // If the error is about the image not being available, re-throw it
    if (err.message && err.message.includes("imageUrl is not yet available")) {
      throw err;
    }
    // Otherwise it's likely a CastError (invalid ObjectId format) – continue searching
    logger.warn(
      `resolveFrameImageUrl | DemoFrame lookup error: ${err.message}`,
    );
  }

  // 2. Try BusinessFrame
  try {
    const businessFrame = await BusinessFrame.findById(selectedFrameId).lean();
    if (businessFrame) {
      if (!businessFrame.coverImageUrl) {
        throw new Error(
          "BusinessFrame found but coverImageUrl is not yet available",
        );
      }
      logger.info(
        `resolveFrameImageUrl | found in BusinessFrame | id=${selectedFrameId}`,
      );
      return {
        imageUrl: businessFrame.coverImageUrl,
        frameType: "BusinessFrame",
      };
    }
  } catch (err) {
    if (
      err.message &&
      err.message.includes("coverImageUrl is not yet available")
    ) {
      throw err;
    }
    logger.warn(
      `resolveFrameImageUrl | BusinessFrame lookup error: ${err.message}`,
    );
  }

  // 3. Try ClientFrame
  try {
    const clientFrame = await ClientFrame.findById(selectedFrameId).lean();
    if (clientFrame) {
      if (!clientFrame.coverImageUrl) {
        throw new Error(
          "ClientFrame found but coverImageUrl is not yet available",
        );
      }
      logger.info(
        `resolveFrameImageUrl | found in ClientFrame | id=${selectedFrameId}`,
      );
      return { imageUrl: clientFrame.coverImageUrl, frameType: "ClientFrame" };
    }
  } catch (err) {
    if (
      err.message &&
      err.message.includes("coverImageUrl is not yet available")
    ) {
      throw err;
    }
    logger.warn(
      `resolveFrameImageUrl | ClientFrame lookup error: ${err.message}`,
    );
  }

  // 4. Try BusinessFrameImage (individual image document)
  try {
    const bfImage = await BusinessFrameImage.findById(selectedFrameId).lean();
    if (bfImage) {
      if (!bfImage.imageUrl) {
        throw new Error(
          "BusinessFrameImage found but imageUrl is not yet available",
        );
      }
      logger.info(
        `resolveFrameImageUrl | found in BusinessFrameImage | id=${selectedFrameId}`,
      );
      return { imageUrl: bfImage.imageUrl, frameType: "BusinessFrameImage" };
    }
  } catch (err) {
    if (err.message && err.message.includes("imageUrl is not yet available")) {
      throw err;
    }
    logger.warn(
      `resolveFrameImageUrl | BusinessFrameImage lookup error: ${err.message}`,
    );
  }

  // 5. Try ClientFrameImage (individual image document)
  try {
    const cfImage = await ClientFrameImage.findById(selectedFrameId).lean();
    if (cfImage) {
      if (!cfImage.imageUrl) {
        throw new Error(
          "ClientFrameImage found but imageUrl is not yet available",
        );
      }
      logger.info(
        `resolveFrameImageUrl | found in ClientFrameImage | id=${selectedFrameId}`,
      );
      return { imageUrl: cfImage.imageUrl, frameType: "ClientFrameImage" };
    }
  } catch (err) {
    if (err.message && err.message.includes("imageUrl is not yet available")) {
      throw err;
    }
    logger.warn(
      `resolveFrameImageUrl | ClientFrameImage lookup error: ${err.message}`,
    );
  }

  throw new Error(
    `No frame found with id=${selectedFrameId} in DemoFrame, BusinessFrame, ClientFrame, BusinessFrameImage, or ClientFrameImage`,
  );
}

/**
 * Resolve the full-resolution festival image URL directly by the
 * FestivalImage document's own _id (ObjectId string).
 */
async function resolveFestivalImageUrlById(festivalImageId) {
  const festivalImage = await FestivalImage.findById(festivalImageId).lean();

  if (!festivalImage) {
    throw new Error(`No festival image found with id=${festivalImageId}`);
  }

  if (!festivalImage.imageUrl) {
    throw new Error("Festival image found but imageUrl is not yet available");
  }

  logger.info(
    `resolveFestivalImageUrlById | festivalImageId=${festivalImageId} | imageUrlPresent=${Boolean(festivalImage.imageUrl)}`,
  );
  return festivalImage.imageUrl;
}

/**
 * Resolve the full-resolution category image URL directly by the
 * CategoryImage document's own _id (ObjectId string).
 */
async function resolveCategoryImageUrlById(categoryImageId) {
  const categoryImage = await CategoryImage.findById(categoryImageId).lean();

  if (!categoryImage) {
    throw new Error(`No category image found with id=${categoryImageId}`);
  }

  if (!categoryImage.imageUrl) {
    throw new Error("Category image found but imageUrl is not yet available");
  }

  logger.info(
    `resolveCategoryImageUrlById | categoryImageId=${categoryImageId} | imageUrlPresent=${Boolean(categoryImage.imageUrl)}`,
  );
  return categoryImage.imageUrl;
}

/**
 * Download a remote image URL and return its raw buffer.
 */
async function downloadImageBuffer(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 20000,
  });
  return Buffer.from(response.data);
}

/**
 * Merge festivalImageUrl (background) with frameImageUrl (overlay/front).
 * The frame is resized to exactly match the festival image dimensions.
 * Returns a PNG buffer.
 */
async function mergeImages(festivalImageBuffer, frameImageBuffer) {
  // Get dimensions of the festival (background) image
  const { width, height } = await sharp(festivalImageBuffer).metadata();

  if (!width || !height) {
    throw new Error("Could not determine dimensions of festival image");
  }

  // Resize frame to exactly match background dimensions, preserving transparency
  const resizedFrame = await sharp(frameImageBuffer)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .png()
    .toBuffer();

  // Composite: festival image behind, frame on top
  const mergedBuffer = await sharp(festivalImageBuffer)
    .ensureAlpha()
    .composite([{ input: resizedFrame, blend: "over" }])
    .png()
    .toBuffer();

  return mergedBuffer;
}

/**
 * Main entry point.
 * selectedFrameId  – MongoDB ObjectId string of the frame (any frame type)
 * festivalImageId  – MongoDB ObjectId string of a FestivalImage document (optional)
 * categoryImageId  – MongoDB ObjectId string of a CategoryImage document (optional)
 *
 * Exactly one of festivalImageId or categoryImageId must be supplied.
 * Returns a PNG buffer ready to stream to the client.
 */
exports.generateMergedImage = async (
  selectedFrameId,
  festivalImageId,
  categoryImageId,
) => {
  logger.info(
    `generateMergedImage | selectedFrameId=${selectedFrameId} | festivalImageId=${festivalImageId || ""} | categoryImageId=${categoryImageId || ""}`,
  );

  // 1. Resolve frame image URL
  const { imageUrl: frameImageUrl, frameType } =
    await resolveFrameImageUrl(selectedFrameId);

  // 2. Resolve background image URL (festival OR category)
  const backgroundImageUrl = festivalImageId
    ? await resolveFestivalImageUrlById(festivalImageId)
    : await resolveCategoryImageUrlById(categoryImageId);

  logger.info(
    `generateMergedImage | frameType=${frameType} | frameResolved=${Boolean(frameImageUrl)} | backgroundResolved=${Boolean(backgroundImageUrl)}`,
  );

  // 3. Download both images in parallel
  const [backgroundBuffer, frameBuffer] = await Promise.all([
    downloadImageBuffer(backgroundImageUrl),
    downloadImageBuffer(frameImageUrl),
  ]);

  // 4. Merge: background behind, frame in front
  const mergedBuffer = await mergeImages(backgroundBuffer, frameBuffer);

  logger.info(
    `generateMergedImage | merge complete | outputBytes=${mergedBuffer.length}`,
  );

  return mergedBuffer;
};
