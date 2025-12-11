import fetch from 'auth/FetchInterceptor'

const AlertService = {}

/* ------------------------------
   📌 Get All Alerts (filter supported)
--------------------------------*/
AlertService.getAllAlerts = function (params = {}) {
  return fetch({
    url: '/alerts/alerts',
    method: 'get',
    params
  })
}

/* ------------------------------
   📌 Mark Alert as Read
--------------------------------*/
AlertService.markAlertRead = function (alertId) {
  return fetch({
    url: `/alerts/alerts/${alertId}/read`,
    method: 'patch'
  })
}

/* ------------------------------
   📌 Mark Alert as Unread
--------------------------------*/
AlertService.markAlertUnread = function (alertId) {
  return fetch({
    url: `/alerts/alerts/${alertId}/unread`,
    method: 'patch'
  })
}

/* ------------------------------
   📌 Resolve Alert (close/resolve)
--------------------------------*/
AlertService.resolveAlert = function (alertId) {
  return fetch({
    url: `/alerts/alerts/${alertId}/resolve`,
    method: 'patch'
  })
}

/* ------------------------------
   📌 Delete Alert (optional)
--------------------------------*/
AlertService.deleteAlert = function (alertId) {
  return fetch({
    url: `/alerts/alerts/${alertId}`,
    method: 'delete'
  })
}

export default AlertService
