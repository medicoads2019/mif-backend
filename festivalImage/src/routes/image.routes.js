const express = require("express");
const controller = require("../controllers/image.controller");

const router = express.Router();

router.post("/batch-upload", controller.uploadMultiple, controller.batchUpload);

router.delete("/by-festival/:festivalId", controller.batchDeleteByFestivalId);

router.get("/status/:status", controller.getByStatus);
router.get("/softdelete/:value", controller.getBySoftDelete);
router.get("/userTypeAccess/:userTypeAccess", controller.getByUserTypeAccess);
router.get("/orientation/:orientation", controller.getByOrientation);
router.get("/festival/:festivalId", controller.getByFestivalId);
router.get("/:id", controller.getById);

router.patch("/reorder", controller.reorderImages);
router.patch("/:id/increment-view", controller.incrementView);
router.patch("/:id/increment-like", controller.incrementLike);
router.patch("/:id/increment-download", controller.incrementDownload);
router.patch(
  "/:id/user-access/:userTypeAccess",
  controller.updateUserTypeAccess,
);
router.patch("/:id/status/:status", controller.updateStatus);
router.patch("/:id/soft-delete", controller.softDeleteImage);
router.patch("/:id/restore", controller.restoreImage);

router.delete("/:id", controller.hardDeleteImage);

module.exports = router;
