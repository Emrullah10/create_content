// E2E sabitleri: ayri port ve ayri veritabani; gelistirme servisleriyle (3100/5174) ve dev DB ile CAKISMAZ.
export const E2E = Object.freeze({
  servicePort: 3199,
  panelPort: 5275,
  dbName: 'create_content_e2e',
  get serviceUrl() {
    return `http://127.0.0.1:${this.servicePort}`;
  },
  get panelUrl() {
    return `http://127.0.0.1:${this.panelPort}`;
  },
  get api() {
    return `${this.serviceUrl}/api/create-content-service-content/v1`;
  },
});
