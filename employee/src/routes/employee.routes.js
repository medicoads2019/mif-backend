const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/employee.controller");

router.post("/create", ctrl.uploadSingle, ctrl.createEmployee);
router.post("/login", ctrl.login);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);
router.post("/change-password", ctrl.changePassword);
router.post("/logout", ctrl.logout);

router.get("/all", ctrl.getAllEmployees);
router.get("/mobile/:mobileNumber", ctrl.getByMobile);
router.get("/email", ctrl.getByEmail);
router.get("/status/:status", ctrl.getByStatus);
router.get("/user-type/:userType", ctrl.getByUserType);
router.get("/soft-delete/:value", ctrl.getBySoftDelete);
router.get("/:employeeId", ctrl.getById);

router.patch(
  "/:employeeId/profile-photo",
  ctrl.uploadSingle,
  ctrl.updateProfilePhoto,
);
router.patch("/:employeeId/personal-info", ctrl.updatePersonalInfo);
router.patch("/:employeeId/password", ctrl.updatePassword);
router.patch("/:employeeId/status/:status", ctrl.updateStatus);
router.patch("/:employeeId/user-type/:userType", ctrl.updateUserType);
router.patch("/:employeeId/verify-mobile-otp", ctrl.verifyMobileOtp);
router.patch("/:employeeId/verify-email-otp", ctrl.verifyEmailOtp);
router.patch("/:employeeId/soft-delete", ctrl.softDelete);
router.patch("/:employeeId/restore", ctrl.restore);
router.patch("/admin/unlock/:employeeId", ctrl.adminUnlockEmployee);

router.delete("/:employeeId/hard-delete", ctrl.hardDelete);

module.exports = router;
