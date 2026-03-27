const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/restriction.controller");

router.get("/", ctrl.getAll);
router.post("/seed", ctrl.seedDefaults);
router.get("/:userType", ctrl.getByUserType);
router.put("/:userType", ctrl.upsert);

module.exports = router;
