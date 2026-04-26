const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/festival.controller");

// ── Static GET routes (must come before /:festivalId) ──────────────────────────
router.get("/all", ctrl.getAllFestivals);
router.get("/published", ctrl.getPublishedFestivals);
router.get("/search", ctrl.searchByFestivalName);
router.get("/status/:status", ctrl.getByStatus);
router.get("/soft-delete/:value", ctrl.getBySoftDelete);

// ── POST ───────────────────────────────────────────────────────────────────────
router.post("/create-festival", ctrl.uploadSingle, ctrl.createFestival);
router.post("/:festivalId/images", ctrl.addImageToFestival);

// ── Dynamic GET ────────────────────────────────────────────────────────────────
router.get("/:festivalId", ctrl.getById);

// ── PATCH ──────────────────────────────────────────────────────────────────────
router.patch(
  "/:festivalId/cover-image",
  ctrl.uploadSingle,
  ctrl.updateFestivalCoverImage,
);
router.patch("/:festivalId/images/:imageId", ctrl.addImagePatch);
router.patch("/:festivalId/status/:status", ctrl.updateStatus);
router.patch("/:festivalId/name", ctrl.updateFestivalName);
router.patch("/:festivalId/date", ctrl.updateFestivalDate);
router.patch("/:festivalId/created-by", ctrl.updateCreatedBy);
router.patch("/:festivalId/uploaded-by", ctrl.updateUploadedBy);
router.patch("/:festivalId/soft-delete", ctrl.softDelete);
router.patch("/:festivalId/restore", ctrl.restore);

// ── DELETE ─────────────────────────────────────────────────────────────────────
router.delete("/:festivalId/images/:imageId", ctrl.removeImageFromFestival);
router.delete("/:festivalId/hard-delete", ctrl.hardDelete);

module.exports = router;
