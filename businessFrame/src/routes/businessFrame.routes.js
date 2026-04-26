const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/businessFrame.controller");

router.post("/create", ctrl.uploadSingle, ctrl.createBusinessFrame);
router.post("/:businessFrameId/images", ctrl.addImageToBusinessFrame);

router.get("/all", ctrl.getAllBusinessFrames);
router.get("/published", ctrl.getPublishedBusinessFrames);
router.get("/status/:status", ctrl.getByStatus);
router.get("/soft-delete/:value", ctrl.getBySoftDelete);
router.get("/code/:code", ctrl.getByCode);
router.get("/:businessFrameId", ctrl.getById);

router.patch(
  "/:businessFrameId/cover-image",
  ctrl.uploadSingle,
  ctrl.updateCoverImage,
);
router.patch("/:businessFrameId/name", ctrl.updateBusinessFrameName);
router.patch("/:businessFrameId/code", ctrl.updateBusinessFrameCode);
router.patch("/:businessFrameId/status/:status", ctrl.updateStatus);
router.patch("/:businessFrameId/created-by", ctrl.updateCreatedBy);
router.patch("/:businessFrameId/uploaded-by", ctrl.updateUploadedBy);
router.patch("/:businessFrameId/soft-delete", ctrl.softDelete);
router.patch("/:businessFrameId/restore", ctrl.restore);

router.delete(
  "/:businessFrameId/images/:imageId",
  ctrl.removeImageFromBusinessFrame,
);
router.delete("/:businessFrameId/hard-delete", ctrl.hardDelete);

module.exports = router;
