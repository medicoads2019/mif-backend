const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/startScreenImage.controller");

router.post("/create", ctrl.uploadSingle, ctrl.create);

router.get("/all", ctrl.getAll);
router.get("/active", ctrl.getActiveForStartScreen);
router.get("/soft-delete/:value", ctrl.getBySoftDelete);
router.get("/:id", ctrl.getById);

router.patch("/reorder", ctrl.reorder);
router.patch("/:id/image", ctrl.uploadSingle, ctrl.updateImage);
router.patch("/:id/name", ctrl.updateName);
router.patch("/:id/status/:status", ctrl.updateStatus);
router.patch("/:id/show-in-start-screen/:value", ctrl.updateShowInStartScreen);
router.patch("/:id/soft-delete", ctrl.softDelete);
router.patch("/:id/restore", ctrl.restore);

router.delete("/:id/hard-delete", ctrl.hardDelete);

module.exports = router;
