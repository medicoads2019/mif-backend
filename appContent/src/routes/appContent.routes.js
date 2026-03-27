const express = require("express");

const router = express.Router();
const ctrl = require("../controllers/appContent.controller");

router.get("/", ctrl.getContent);
router.put("/", ctrl.updateContent);

module.exports = router;
