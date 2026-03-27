"use strict";

const { Router } = require("express");
const controller = require("../controllers/imageDownload.controller");

const router = Router();

/* ======================================================
   POST /image-download/merge
   Body: { selectedFrameId, festivalImageId }
   Returns merged PNG as file download
====================================================== */
router.post("/merge", controller.downloadMergedImage);

/* ======================================================
   GET /image-download/preview
   Query: ?selectedFrameId=...&festivalImageId=...
   Returns merged PNG inline (for browser preview)
====================================================== */
router.get("/preview", controller.previewMergedImage);

module.exports = router;
