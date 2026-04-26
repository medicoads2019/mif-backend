const express = require("express");

const router = express.Router();
const ctrl = require("../controllers/feedback.controller");

router.post("/create", ctrl.createFeedback);
router.get("/all", ctrl.getAllFeedbacks);
router.get("/trash", ctrl.getTrashFeedbacks);
router.get("/:feedbackId", ctrl.getById);
router.patch("/:feedbackId/status", ctrl.updateStatus);
router.delete("/:feedbackId", ctrl.deleteFeedback);
router.patch("/:feedbackId/restore", ctrl.restoreFeedback);
router.delete("/:feedbackId/hard", ctrl.hardDeleteFeedback);

module.exports = router;
