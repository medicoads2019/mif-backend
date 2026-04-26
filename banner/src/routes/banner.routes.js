const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/banner.controller");

router.post("/create-banner", ctrl.uploadSingle, ctrl.createBanner);

router.get("/all", ctrl.getAllBanners);
router.get("/carousel", ctrl.getCarouselBanners);
router.get("/published", ctrl.getPublishedBanners);
router.get("/search", ctrl.searchBanners);
router.get("/status/:status", ctrl.getByStatus);
router.get("/soft-delete/:value", ctrl.getBySoftDelete);
router.get("/:bannerId", ctrl.getById);

router.patch("/reorder", ctrl.reorderBanners);
router.patch("/:bannerId/image", ctrl.uploadSingle, ctrl.updateBannerImage);
router.patch("/:bannerId/name", ctrl.updateBannerName);
router.patch("/:bannerId/status/:status", ctrl.updateStatus);
router.patch("/:bannerId/carousel/:value", ctrl.updateCarousel);
router.patch("/:bannerId/created-by", ctrl.updateCreatedBy);
router.patch("/:bannerId/uploaded-by", ctrl.updateUploadedBy);
router.patch("/:bannerId/soft-delete", ctrl.softDelete);
router.patch("/:bannerId/restore", ctrl.restore);

router.delete("/:bannerId/hard-delete", ctrl.hardDelete);

module.exports = router;
