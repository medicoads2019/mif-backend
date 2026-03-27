const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/category.controller");

router.get("/all", ctrl.getAllCategorys);
router.get("/published", ctrl.getPublishedCategorys);
router.get("/search", ctrl.searchByCategoryName);
router.get("/status/:status", ctrl.getByStatus);
router.get("/soft-delete/:value", ctrl.getBySoftDelete);

router.post("/create-category", ctrl.uploadSingle, ctrl.createCategory);
router.post("/:categoryId/images", ctrl.addImageToCategory);

router.get("/:categoryId", ctrl.getById);

router.patch("/reorder", ctrl.reorderCategorys);
router.patch(
  "/:categoryId/cover-image",
  ctrl.uploadSingle,
  ctrl.updateCategoryCoverImage,
);
router.patch("/:categoryId/images/:imageId", ctrl.addImagePatch);
router.patch("/:categoryId/status/:status", ctrl.updateStatus);
router.patch("/:categoryId/name", ctrl.updateCategoryName);
router.patch("/:categoryId/date", ctrl.updateCategoryDate);
router.patch("/:categoryId/soft-delete", ctrl.softDelete);
router.patch("/:categoryId/restore", ctrl.restore);

router.delete("/:categoryId/images/:imageId", ctrl.removeImageFromCategory);
router.delete("/:categoryId/hard-delete", ctrl.hardDelete);

module.exports = router;
