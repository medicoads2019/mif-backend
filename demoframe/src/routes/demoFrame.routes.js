const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/demoFrame.controller");

router.post("/create-demoFrame", ctrl.uploadSingle, ctrl.createDemoFrame);

router.get("/all", ctrl.getAllDemoFrames);
router.get("/carousel", ctrl.getCarouselDemoFrames);
router.get("/published", ctrl.getPublishedDemoFrames);
router.get("/search", ctrl.searchDemoFrames);
router.get("/status/:status", ctrl.getByStatus);
router.get("/soft-delete/:value", ctrl.getBySoftDelete);
router.get("/:demoFrameId", ctrl.getById);

router.patch("/reorder", ctrl.reorderDemoFrames);
router.patch(
  "/:demoFrameId/image",
  ctrl.uploadSingle,
  ctrl.updateDemoFrameImage,
);
router.patch("/:demoFrameId/name", ctrl.updateDemoFrameName);
router.patch("/:demoFrameId/status/:status", ctrl.updateStatus);
router.patch("/:demoFrameId/carousel/:value", ctrl.updateCarousel);
router.patch("/:demoFrameId/soft-delete", ctrl.softDelete);
router.patch("/:demoFrameId/restore", ctrl.restore);

router.delete("/:demoFrameId/hard-delete", ctrl.hardDelete);

module.exports = router;
