const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/business.controller");

router.get("/all", ctrl.getAllBusinesss);
router.get("/published", ctrl.getPublishedBusinesss);
router.get("/search", ctrl.searchByBusinessName);
router.get("/status/:status", ctrl.getByStatus);
router.get("/soft-delete/:value", ctrl.getBySoftDelete);

router.post("/create-business", ctrl.uploadSingle, ctrl.createBusiness);
router.post("/:businessId/images", ctrl.addImageToBusiness);

router.get("/:businessId", ctrl.getById);

router.patch(
  "/:businessId/cover-image",
  ctrl.uploadSingle,
  ctrl.updateBusinessCoverImage,
);
router.patch("/:businessId/images/:imageId", ctrl.addImagePatch);
router.patch("/:businessId/status/:status", ctrl.updateStatus);
router.patch("/:businessId/name", ctrl.updateBusinessName);
router.patch("/:businessId/date", ctrl.updateBusinessDate);
router.patch("/:businessId/soft-delete", ctrl.softDelete);
router.patch("/:businessId/restore", ctrl.restore);

router.delete("/:businessId/images/:imageId", ctrl.removeImageFromBusiness);
router.delete("/:businessId/hard-delete", ctrl.hardDelete);

module.exports = router;
