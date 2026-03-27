const express = require("express");

const router = express.Router();
const ctrl = require("../controllers/contact.controller");

router.post("/create", ctrl.createContact);
router.get("/all", ctrl.getAllContacts);
router.patch("/reorder", ctrl.reorderContacts);
router.get("/:contactId", ctrl.getById);
router.patch("/:contactId", ctrl.updateContact);
router.delete("/:contactId", ctrl.deleteContact);

module.exports = router;
