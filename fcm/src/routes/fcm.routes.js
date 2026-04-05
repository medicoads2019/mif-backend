const express = require("express");

const router = express.Router();
const ctrl = require("../controllers/fcm.controller");

router.post("/device-token", ctrl.registerDeviceToken);
router.delete("/device-token", ctrl.unregisterDeviceToken);
router.get("/stats", ctrl.getStats);
router.post("/send", ctrl.sendNotification);

module.exports = router;
