"use strict";

const service = require("../services/imageDownload.service");
const logger = require("../utils/logger");

/**
 * POST /image-download/merge
 * Body: { selectedFrameId, festivalImageId }
 * Returns: merged PNG image as a file download
 */
exports.downloadMergedImage = async (req, res) => {
  const { selectedFrameId, festivalImageId, categoryImageId } = req.body;

  if (!selectedFrameId || !selectedFrameId.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "selectedFrameId is required" });
  }

  const hasFesvitalId = festivalImageId && festivalImageId.trim();
  const hasCategoryId = categoryImageId && categoryImageId.trim();

  if (!hasFesvitalId && !hasCategoryId) {
    return res.status(400).json({
      success: false,
      message: "Either festivalImageId or categoryImageId is required",
    });
  }

  try {
    const mergedBuffer = await service.generateMergedImage(
      selectedFrameId.trim(),
      hasFesvitalId ? festivalImageId.trim() : undefined,
      hasCategoryId ? categoryImageId.trim() : undefined,
    );

    const filename = `merged_${Date.now()}.png`;

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": mergedBuffer.length,
    });

    return res.send(mergedBuffer);
  } catch (err) {
    logger.error(`downloadMergedImage | error: ${err.message}`);

    if (
      err.message.includes("No frame found") ||
      err.message.includes("No festival image found") ||
      err.message.includes("No category image found")
    ) {
      return res.status(404).json({ success: false, message: err.message });
    }

    if (
      err.message.includes("imageUrl is not yet available") ||
      err.message.includes("coverImageUrl is not yet available")
    ) {
      return res.status(422).json({ success: false, message: err.message });
    }

    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /image-download/preview
 * Query: ?selectedFrameId=...&festivalImageId=...
 * Returns: merged PNG image inline (for browser preview)
 */
exports.previewMergedImage = async (req, res) => {
  const { selectedFrameId, festivalImageId } = req.query;

  if (!selectedFrameId || !selectedFrameId.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "selectedFrameId is required" });
  }

  if (!festivalImageId || !festivalImageId.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "festivalImageId is required" });
  }

  try {
    const mergedBuffer = await service.generateMergedImage(
      selectedFrameId.trim(),
      festivalImageId.trim(),
    );

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": "inline",
      "Content-Length": mergedBuffer.length,
    });

    return res.send(mergedBuffer);
  } catch (err) {
    logger.error(`previewMergedImage | error: ${err.message}`);

    if (
      err.message.includes("No frame found") ||
      err.message.includes("No festival image found")
    ) {
      return res.status(404).json({ success: false, message: err.message });
    }

    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
