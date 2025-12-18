import React from 'react'
import { AUTH_PREFIX_PATH, APP_PREFIX_PATH } from 'configs/AppConfig'

export const publicRoutes = [
    {
        key: 'login',
        path: `${AUTH_PREFIX_PATH}/login`,
        component: React.lazy(() => import('views/auth-views/authentication/login')),
    },
    {
        key: 'forgot-password',
        path: `${AUTH_PREFIX_PATH}/forgot-password`,
        component: React.lazy(() => import('views/auth-views/authentication/forgot-password')),
    },
    {
        key: 'verify-code',
        path: `${AUTH_PREFIX_PATH}/verify-code`,
        component: React.lazy(() => import('views/auth-views/authentication/verify-code')),
    },
    {
        key: 'reset-password',
        path: `${AUTH_PREFIX_PATH}/reset-password`,
        component: React.lazy(() => import('views/auth-views/authentication/reset-password')),
    },
    {
        key: 'error-page-1',
        path: `${AUTH_PREFIX_PATH}/error-page-1`,
        component: React.lazy(() => import('views/auth-views/errors/error-page-1')),
    },
    {
        key: 'error-page-2',
        path: `${AUTH_PREFIX_PATH}/error-page-2`,
        component: React.lazy(() => import('views/auth-views/errors/error-page-2')),
    },
]

export const protectedRoutes = [
    {
        key: 'admin-role',
        path: `${APP_PREFIX_PATH}/admin/role`,
        component: React.lazy(() => import('views/app-views/admin/adminRole/index')),
    },
    {
        key: 'library-mpn',
        path: `${APP_PREFIX_PATH}/library/mpn-master-list`,
        component: React.lazy(() => import('views/app-views/library/MpnMasterList/index')),
    },
    {
        key: 'library-child',
        path: `${APP_PREFIX_PATH}/library/child-part-library`,
        component: React.lazy(() => import('views/app-views/library/ChildPartLibrary/index')),
    },
    {
        key: 'sales-create-quote',
        path: `${APP_PREFIX_PATH}/sales/create-quote`,
        component: React.lazy(() => import('views/app-views/sales/createQuote/index')),
    },
    {
        key: 'sales-customer-managment',
        path: `${APP_PREFIX_PATH}/sales/sales-customer-managment`,
        component: React.lazy(() => import('views/app-views/sales/customerManagment/index')),
    },
    {
        key: 'sales-project-managment',
        path: `${APP_PREFIX_PATH}/sales/project-managment`,
        component: React.lazy(() => import('views/app-views/sales/projectManagment/index')),
    },
    {
        key: 'sales-create-order-mto',
        path: `${APP_PREFIX_PATH}/sales/create-order-mto/view/:id`,
        component: React.lazy(() => import('views/app-views/sales/createOrderMTO/viewOrderMTO')),
    },
    {
        key: 'sales-create-order-mto',
        path: `${APP_PREFIX_PATH}/sales/create-order-mto`,
        component: React.lazy(() => import('views/app-views/sales/createOrderMTO/index')),
    },
    {
        key: 'work-order-managment',
        path: `${APP_PREFIX_PATH}/work-order/work-order-managment`,
        component: React.lazy(() => import('views/app-views/work-order/workOrderManagmentPage/index')),
    },
    {
        key: 'delivery-order',
        path: `${APP_PREFIX_PATH}/work-order/delivery-order`,
        component: React.lazy(() => import('views/app-views/work-order/deliveyOrderPage/index')),
    },
    {
        key: 'mpn-tracker',
        path: `${APP_PREFIX_PATH}/work-order/mpn-tracker`,
        component: React.lazy(() => import('views/app-views/work-order/workOrderManagmentPage/mpn-tracker/index')),
    },
    {
        key: 'inventory-list',
        path: `${APP_PREFIX_PATH}/inventory/inventory-list`,
        component: React.lazy(() => import('views/app-views/inventory/inventoryListPage/index')),
    },
    {
        key: 'mto-inventory',
        path: `${APP_PREFIX_PATH}/inventory/mto-inventory`,
        component: React.lazy(() => import('views/app-views/inventory/mtoInventoryList/index')),
    },
     {
        key: 'recieve-material',
        path: `${APP_PREFIX_PATH}/inventory/recieve-material`,
        component: React.lazy(() => import('views/app-views/inventory/receiveMaterialPage/index')),
    },
    {
        key: 'purchase-order',
        path: `${APP_PREFIX_PATH}/purchase/purchase-order`,
        component: React.lazy(() => import('views/app-views/purchase/purchaseOrderPage/index')),
    },
    {
        key: 'create-purchase-order',
        path: `${APP_PREFIX_PATH}/purchase/create-purchase-order`,
        component: React.lazy(() => import('views/app-views/purchase/createPurchaseOrder/index')),
    },
    {
        key: 'edit-purchase-order',
        path: `${APP_PREFIX_PATH}/purchase/edit-purchase-order/:id`,
        component: React.lazy(() => import('views/app-views/purchase/createPurchaseOrder/index')),
    },
    {
        key: 'view-purchase-order',
        path: `${APP_PREFIX_PATH}/purchase/view-purchase-order/:id`,
        component: React.lazy(() => import('views/app-views/purchase/viewPurchaseOrder/index')),
    },
    {
        key: 'purchase-history',
        path: `${APP_PREFIX_PATH}/purchase/purchase-history`,
        component: React.lazy(() => import('views/app-views/purchase/purchaseHistoryPage/index')),
    },
    {
        key: 'purchase-managment',
        path: `${APP_PREFIX_PATH}/purchase/purchase-managment`,
        component: React.lazy(() => import('views/app-views/purchase/purchaseSupplierManagmentPage/index')),
    },
    {
        key: 'production',
        path: `${APP_PREFIX_PATH}/production`,
        component: React.lazy(() => import('views/app-views/production/productionListPage/index')),
    },
     {
        key: 'purchase-settings',
        path: `${APP_PREFIX_PATH}/purchase/purchase-settings`,
        component: React.lazy(() => import('views/app-views/purchase/purchaseSettingsPage/index')),
    },
    {
        key: 'settings-user-managment',
        path: `${APP_PREFIX_PATH}/settings/settings-user-managment`,
        component: React.lazy(() => import('views/app-views/settings/user-managment/index')),
    },
    {
        key: 'settings-skill-level-costing',
        path: `${APP_PREFIX_PATH}/settings/settings-skill-level-costing`,
        component: React.lazy(() => import('views/app-views/settings/skill-level-costing/index')),
    },
    {
        key: 'settings-system-settings',
        path: `${APP_PREFIX_PATH}/settings/settings-system-settings`,
        component: React.lazy(() => import('views/app-views/settings/system-settings/index')),
    },
    {
        key: 'settings-markup-parameter',
        path: `${APP_PREFIX_PATH}/settings/settings-markup-parameter`,
        component: React.lazy(() => import('views/app-views/settings/markup-parameters/index')),
    },
     {
        key: 'currency-setting',
        path: `${APP_PREFIX_PATH}/settings/currency-setting`,
        component: React.lazy(() => import('views/app-views/settings/currency-setting/index')),
    },
     {
        key: 'category-setting',
        path: `${APP_PREFIX_PATH}/settings/category-setting`,
        component: React.lazy(() => import('views/app-views/settings/category-setting/index')),
    },
     {
        key: 'uom-setting',
        path: `${APP_PREFIX_PATH}/settings/uom-setting`,
        component: React.lazy(() => import('views/app-views/settings/uom-setting/index')),
    },
    {
        key: 'dashboard.default',
        path: `${APP_PREFIX_PATH}/dashboards/default`,
        component: React.lazy(() => import('views/app-views/dashboards/default')),
    },
     {
        key: 'edit-profile',
        path: `${APP_PREFIX_PATH}/pages/change-password`,
        component: React.lazy(() => import('views/app-views/pages/change-password/index')),
    },
     {
        key: 'change-password',
        path: `${APP_PREFIX_PATH}/pages/edit-profile`,
        component: React.lazy(() => import('views/app-views/pages/edit-profile/index')),
    },
     {
        key: 'sample-files',
        path: `${APP_PREFIX_PATH}/pages/sample-files`,
        component: React.lazy(() => import('views/app-views/pages/sample-files/index')),
    },
]