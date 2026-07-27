import BusinessService from "../services/BusinessService.js";

const send = (res, data, message = "Success", status = 200) => {
  res.status(status).json({ success: true, message, data });
};

export const BusinessController = {
  async list(_req, res, next) {
    try {
      const data = await BusinessService.list();
      send(res, data, "Business settings retrieved");
    } catch (e) {
      next(e);
    }
  },

  async get(req, res, next) {
    try {
      const doc = await BusinessService.getFirst();
      if (!doc) {
        const created = await BusinessService.getOrCreateDefault({});
        return send(res, created, "Default business settings created", 201);
      }
      send(res, doc, "Business settings retrieved");
    } catch (e) {
      next(e);
    }
  },

  async create(req, res, next) {
    try {
      const data = req.validBody || req.body;
      const doc = await BusinessService.create(data);
      send(res, doc, "Business settings saved", 201);
    } catch (e) {
      next(e);
    }
  },

  async upsert(req, res, next) {
    try {
      const data = req.validBody || req.body;
      const existing = await BusinessService.getFirst();
      if (existing) {
        const doc = await BusinessService.update(existing._id, data);
        return send(res, doc, "Business settings updated");
      }
      const doc = await BusinessService.create(data);
      send(res, doc, "Business settings created", 201);
    } catch (e) {
      next(e);
    }
  },

  async update(req, res, next) {
    try {
      const data = req.validBody || req.body;
      const existing = await BusinessService.getFirst();
      if (!existing) {
        const doc = await BusinessService.create(data);
        return send(res, doc, "Business settings created", 201);
      }
      const doc = await BusinessService.update(existing._id, data);
      send(res, doc, "Business settings updated");
    } catch (e) {
      next(e);
    }
  },

  async remove(req, res, next) {
    try {
      const existing = await BusinessService.getFirst();
      if (!existing) return send(res, null, "No business settings to delete");
      await BusinessService.remove(existing._id);
      send(res, null, "Business settings deleted");
    } catch (e) {
      next(e);
    }
  },
};

export default BusinessController;
