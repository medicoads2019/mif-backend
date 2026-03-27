const service = require("../services/contact.service");

exports.createContact = async (req, res) => {
  try {
    const result = await service.createContact(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getAllContacts = async (req, res) => {
  try {
    const result = await service.getAllContacts();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await service.getById(req.params.contactId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const result = await service.updateContact(req.params.contactId, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const result = await service.deleteContact(req.params.contactId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.reorderContacts = async (req, res) => {
  try {
    const result = await service.reorderContacts(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
