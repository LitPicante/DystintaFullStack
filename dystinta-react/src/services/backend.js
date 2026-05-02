import api from "./api";

export const authService = {
  login(credentials) {
    return api.post("/auth/login/", credentials).then((response) => response.data);
  },
  logout(refresh) {
    return api.post("/auth/logout/", { refresh });
  },
  me() {
    return api.get("/auth/me/").then((response) => response.data);
  },
};

export const siteService = {
  getPublic() {
    return api.get("/site/public/").then((response) => response.data);
  },
  updateSection(section, payload, config) {
    return api.patch(`/site/${section}/`, payload, config).then((response) => response.data);
  },
  updateCatalog(payload, config) {
    return api.patch("/site/catalog/", payload, config).then((response) => response.data);
  },
};

export const orderService = {
  list(params) {
    return api.get("/orders/", { params }).then((response) => response.data);
  },
  stats(params) {
    return api.get("/orders/stats/", { params }).then((response) => response.data);
  },
  create(payload, config) {
    return api.post("/orders/", payload, config).then((response) => response.data);
  },
  update(id, payload) {
    return api.patch(`/orders/${id}/`, payload).then((response) => response.data);
  },
  getTracking(token) {
    return api.get(`/orders/tracking/${token}/`).then((response) => response.data);
  },
};

export const userService = {
  list() {
    return api.get("/users/").then((response) => response.data);
  },
  listDesigners() {
    return api.get("/users/designers/").then((response) => response.data);
  },
  create(payload) {
    return api.post("/users/", payload).then((response) => response.data);
  },
  update(id, payload) {
    return api.patch(`/users/${id}/`, payload).then((response) => response.data);
  },
  remove(id) {
    return api.delete(`/users/${id}/`);
  },
};

export const mediaService = {
  listHomeCarousel() {
    return api.get("/media/home-carousel/").then((response) => response.data);
  },
  uploadHomeCarousel(slot, file) {
    const payload = new FormData();
    payload.append("file", file);
    return api
      .post(`/media/home-carousel/${slot}/`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((response) => response.data);
  },
  removeHomeCarousel(slot) {
    return api.delete(`/media/home-carousel/${slot}/`);
  },
};

export const adminToolsService = {
  exportData() {
    return api.get("/admin/export/").then((response) => response.data);
  },
  reset() {
    return api.post("/admin/reset/").then((response) => response.data);
  },
  importData(data) {
    if (data instanceof File) {
      const payload = new FormData();
      payload.append("file", data);
      return api
        .post("/admin/import/", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((response) => response.data);
    }

    return api.post("/admin/import/", data).then((response) => response.data);
  },
};
