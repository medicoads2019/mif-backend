const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/client.controller");

router.post("/create", ctrl.uploadSingle, ctrl.createClient);
router.post("/login", ctrl.login);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);
router.post("/change-password", ctrl.changePassword);
router.post("/logout", ctrl.logout);

router.get("/all", ctrl.getAllClients);
router.get("/mobile/:mobileNumber", ctrl.getByMobile);
router.get("/email", ctrl.getByEmail);
router.get("/status/:status", ctrl.getByStatus);
router.get("/user-type/:userType", ctrl.getByUserType);
router.get("/soft-delete/:value", ctrl.getBySoftDelete);
router.get("/:clientId", ctrl.getById);

router.patch(
  "/:clientId/profile-photo",
  ctrl.uploadSingle,
  ctrl.updateProfilePhoto,
);
router.patch("/:clientId/personal-info", ctrl.updatePersonalInfo);
router.patch("/:clientId/business-info", ctrl.updateBusinessInfo);
router.patch("/:clientId/password", ctrl.updatePassword);
router.patch("/:clientId/status/:status", ctrl.updateStatus);
router.patch("/:clientId/user-type/:userType", ctrl.updateUserType);
router.patch("/:clientId/subscription", ctrl.updateSubscription);
router.patch("/:clientId/business-frames", ctrl.addBusinessFrameId);
router.patch("/:clientId/client-frames", ctrl.addClientFrameId);
router.patch("/:clientId/set-business-frame-ids", ctrl.setBusinessFrameIds);
router.patch("/:clientId/set-client-frame-ids", ctrl.setClientFrameIds);
router.patch("/:clientId/selected-frame", ctrl.updateSelectedFrame);
router.delete(
  "/:clientId/business-frame-image/:imageId",
  ctrl.removeBusinessFrameImageId,
);
router.delete(
  "/:clientId/client-frame-image/:imageId",
  ctrl.removeClientFrameImageId,
);
router.patch("/:clientId/referral-code", ctrl.setReferralCode);
router.patch("/:clientId/verify-mobile-otp", ctrl.verifyMobileOtp);
router.patch("/:clientId/send-email-otp", ctrl.sendEmailOtp);
router.patch("/:clientId/verify-email-otp", ctrl.verifyEmailOtp);
router.patch("/:clientId/soft-delete", ctrl.softDelete);
router.patch("/:clientId/restore", ctrl.restore);
router.patch(
  "/:clientId/increment-download-count",
  ctrl.incrementDownloadCount,
);
router.patch("/admin/unlock/:clientId", ctrl.adminUnlockClient);

router.delete("/:clientId/hard-delete", ctrl.hardDelete);

module.exports = router;
