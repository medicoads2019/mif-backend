const express = require("express");

const router = express.Router();
const ctrl = require("../controllers/fcm.controller");

router.post("/device-token", ctrl.registerDeviceToken);
router.delete("/device-token", ctrl.unregisterDeviceToken);
router.get("/stats", ctrl.getStats);
router.post("/send", ctrl.sendNotification);

// Sent notifications CRUD
router.get("/sent", ctrl.getSentNotifications);
router.put("/sent/:id", ctrl.updateSentNotification);
router.delete("/sent/:id", ctrl.deleteSentNotification);

module.exports = router;
