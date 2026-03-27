const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/image.controller");

router.post("/batch-upload", ctrl.uploadMultiple, ctrl.batchUpload);

router.delete("/by-business/:businessId", ctrl.batchDeleteByBusinessId);

router.get("/status/:status", ctrl.getByStatus);
router.get("/softdelete/:value", ctrl.getBySoftDelete);
router.get("/userTypeAccess/:userTypeAccess", ctrl.getByUserTypeAccess);
router.get("/orientation/:orientation", ctrl.getByOrientation);
router.get("/business/:businessId", ctrl.getByBusinessId);
router.get("/:id", ctrl.getById);

router.patch("/reorder", ctrl.reorderImages);
router.patch("/:id/increment-view", ctrl.incrementView);
router.patch("/:id/increment-like", ctrl.incrementLike);
router.patch("/:id/increment-download", ctrl.incrementDownload);
router.patch("/:id/user-access/:userTypeAccess", ctrl.updateUserTypeAccess);
router.patch("/:id/status/:status", ctrl.updateStatus);
router.patch("/:id/soft-delete", ctrl.softDeleteImage);
router.patch("/:id/restore", ctrl.restoreImage);

router.delete("/:id", ctrl.hardDeleteImage);

module.exports = router;
