const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/clientFrame.controller");

router.post("/create", ctrl.uploadSingle, ctrl.createClientFrame);
router.post("/:clientFrameId/images", ctrl.addImageToClientFrame);

router.get("/all", ctrl.getAllClientFrames);
router.get("/published", ctrl.getPublishedClientFrames);
router.get("/status/:status", ctrl.getByStatus);
router.get("/soft-delete/:value", ctrl.getBySoftDelete);
router.get("/code/:code", ctrl.getByCode);
router.get("/:clientFrameId", ctrl.getById);

router.patch(
  "/:clientFrameId/cover-image",
  ctrl.uploadSingle,
  ctrl.updateCoverImage,
);
router.patch("/:clientFrameId/name", ctrl.updateClientFrameName);
router.patch("/:clientFrameId/status/:status", ctrl.updateStatus);
router.patch("/:clientFrameId/created-by", ctrl.updateCreatedBy);
router.patch("/:clientFrameId/uploaded-by", ctrl.updateUploadedBy);
router.patch("/:clientFrameId/soft-delete", ctrl.softDelete);
router.patch("/:clientFrameId/restore", ctrl.restore);

router.delete(
  "/:clientFrameId/images/:imageId",
  ctrl.removeImageFromClientFrame,
);
router.delete("/:clientFrameId/hard-delete", ctrl.hardDelete);

module.exports = router;
