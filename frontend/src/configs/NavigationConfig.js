import {
  DashboardOutlined,
  FileTextOutlined,
  PlusCircleOutlined,
  ShoppingCartOutlined,
  PlusOutlined,
  UsergroupAddOutlined,
  FileAddOutlined,
  FolderOutlined,
  SettingOutlined,
  PercentageOutlined,
  ToolOutlined,
  TagsOutlined,
  BarsOutlined,
  DatabaseOutlined,
  FolderOpenOutlined,
  PartitionOutlined,
  CarOutlined,
  BuildOutlined,
  SolutionOutlined
} from '@ant-design/icons';
import {APP_PREFIX_PATH } from 'configs/AppConfig'

const dashBoardNavTree = [{
  key: 'dashboards',
  path: `${APP_PREFIX_PATH}/dashboards`,
  title: 'sidenav.dashboard',
  icon: DashboardOutlined,
  breadcrumb: false,
  permissions:["dashboard:view"],
  isGroupTitle: false
}]

const salesNavTree = [{
  key: 'sales',
  path: `${APP_PREFIX_PATH}/sales`,
  title: 'sales.sales',
  icon: ShoppingCartOutlined,
  breadcrumb: false,
  isGroupTitle: false,
  submenu: [
    {
      key: 'sales-create-quote',
      path: `${APP_PREFIX_PATH}/sales/create-quote`,
      title: 'sales.create-quote',
      icon: PlusOutlined,
      breadcrumb: false,
      permissions: ["sales.quote:view"],
      submenu: []
    },
    {
      key: 'sales-customer-managment',
      path: `${APP_PREFIX_PATH}/sales/sales-customer-managment`,
      title: 'sales.sales-customer-managment',
      icon: UsergroupAddOutlined,
      breadcrumb: false,
      permissions: ["sales.customer:view"],
      submenu: []
    },
    {
      key: 'sales-project-managment',
      path: `${APP_PREFIX_PATH}/sales/project-managment`,
      title: 'sales.project-managment',
      icon: FolderOutlined,
      breadcrumb: false,
      permissions: ["sales.project:view"],
      submenu: []
    },
    {
      key: 'sales-create-order-mto',
      path: `${APP_PREFIX_PATH}/sales/create-order-mto`,
      title: 'sales.create-order-mto',
      icon: FileAddOutlined,
      breadcrumb: false,
      permissions: ["sales.mto:view"],
      submenu: []
    }
  ]
}]

const workingOrderNavTree = [{
  key: 'work-order',
  path: `${APP_PREFIX_PATH}/work-order`,
  title: 'work-order.work-order',
  icon: FileTextOutlined,
  breadcrumb: false,
  isGroupTitle: false,
  submenu: [
    {
      key: 'work-order-managment',
      path: `${APP_PREFIX_PATH}/work-order/work-order-managment`,
      title: 'work-order.work-order-managment',
      icon: PlusCircleOutlined,
      breadcrumb: false,
      permissions: ["work_order.work_order_managment:view"],
      submenu: []
    },
    {
      key: 'delivery-order',
      path: `${APP_PREFIX_PATH}/work-order/delivery-order`,
      title: 'work-order.delivery-order',
      icon: CarOutlined,
      breadcrumb: false,
      permissions: ["work_order.delivery_order:view"],
      submenu: []
    }
  ]
}]

const libraryNavTree = [{
  key: 'library',
  path: `${APP_PREFIX_PATH}/library`,
  title: 'library.library',
  icon: DatabaseOutlined,
  breadcrumb: false,
  isGroupTitle: false,
  submenu: [
    {
      key: 'library-mpn',
      path: `${APP_PREFIX_PATH}/library/mpn-master-list`,
      title: 'library.mpn',
      icon: PartitionOutlined,
      breadcrumb: false,
      permissions: ["library.mpn:view"],
      submenu: []
    },
    {
      key: 'library-child',
      path: `${APP_PREFIX_PATH}/library/child-part-library`,
      title: 'library.child-part',
      icon: FolderOpenOutlined,
      breadcrumb: false,
      permissions: ["library.child:view"],
      submenu: []
    }
  ]
}]

const settingsNavTree = [{
  key: 'settings',
  path: `${APP_PREFIX_PATH}/settings`,
  title: 'settings.settings',
  icon: SettingOutlined,
  breadcrumb: false,
  isGroupTitle: false,
  // permissions: ["view:role"],
  submenu: [
    {
      key: 'settings-user-managment',
      path: `${APP_PREFIX_PATH}/settings/settings-user-managment`,
      title: 'settings.settings-user-managment',
      icon: UsergroupAddOutlined,
      breadcrumb: false,
      permissions: ["settings.userManagement:view"],
      submenu: []
    },
    {
      key: 'settings-skill-level-costing',
      path: `${APP_PREFIX_PATH}/settings/settings-skill-level-costing`,
      title: 'settings.settings-skill-level-costing',
      icon: ToolOutlined,
      breadcrumb: false,
      permissions: ["settings.skillLevel:view"],
      submenu: []
    },
    {
      key: 'settings-system-settings',
      path: `${APP_PREFIX_PATH}/settings/settings-system-settings`,
      title: 'settings.settings-system-settings',
      icon: SettingOutlined,
      breadcrumb: false,
      permissions: ["settings.systemSettings:view"],
      submenu: []
    },
    {
      key: 'settings-markup-parameter',
      path: `${APP_PREFIX_PATH}/settings/settings-markup-parameter`,
      title: 'settings.settings-markup-parameter',
      icon: PercentageOutlined,
      breadcrumb: false,
      permissions: ["settings.markupParameter:view"],
      submenu: []
    },
    // {
    //   key: 'currency-setting',
    //   path: `${APP_PREFIX_PATH}/settings/currency-setting`,
    //   title: 'settings.currency-setting',
    //   icon: PoundCircleOutlined,
    //   breadcrumb: false,
    //   permissions: ["settings.currencyManagment:view"],
    //   submenu: []
    // },
    {
      key: 'category-setting',
      path: `${APP_PREFIX_PATH}/settings/category-setting`,
      title: 'settings.category-setting',
      icon: TagsOutlined,
      breadcrumb: false,
      permissions: ["settings.categoryManagment:view"],
      submenu: []
    },
    {
      key: 'uom-setting',
      path: `${APP_PREFIX_PATH}/settings/uom-setting`,
      title: 'settings.uom-setting',
      icon: BarsOutlined,
      breadcrumb: false,
      permissions: ["settings.uomManagment:view"],
      submenu: []
    }
  ]
}]

const inventoryNavTree = [{
  key: 'inventory',
  path: `${APP_PREFIX_PATH}/inventory`,
  title: 'inventory.inventory',
  icon: DatabaseOutlined,
  breadcrumb: false,
  isGroupTitle: false,
  submenu: [
    {
      key: 'inventory-list',
      path: `${APP_PREFIX_PATH}/inventory/inventory-list`,
      title: 'inventory.inventory-list',
      icon: PlusOutlined,
      breadcrumb: false,
      permissions: ["inventory.inventory:view"],
      submenu: []
    },
    {
      key: 'mto-inventory',
      path: `${APP_PREFIX_PATH}/inventory/mto-inventory`,
      title: 'inventory.mto-inventory',
      icon: UsergroupAddOutlined,
      permissions: ["inventory.mto_inventory:view"],
      breadcrumb: false,
      submenu: []
    },
    {
      key: 'recieve-material',
      path: `${APP_PREFIX_PATH}/inventory/recieve-material`,
      title: 'inventory.recieve-material',
      icon: UsergroupAddOutlined,
      permissions: ["inventory.recieve_material:view"],
      breadcrumb: false,
      submenu: []
    }
  ]
}]

const purchaseNavTree = [{
  key: 'purchase',
  path: `${APP_PREFIX_PATH}/purchase`,
  title: 'purchase.purchase',
  icon: SolutionOutlined,
  breadcrumb: false,
  isGroupTitle: false,
  submenu: [
    {
      key: 'purchase-order',
      path: `${APP_PREFIX_PATH}/purchase/purchase-order`,
      title: 'purchase.purchase-order',
      icon: PlusOutlined,
      breadcrumb: false,
      permissions: ["purchase.purchase_order:view"],
      submenu: []
    },
    {
      key: 'purchase-history',
      path: `${APP_PREFIX_PATH}/purchase/purchase-history`,
      title: 'purchase.purchase-history',
      icon: UsergroupAddOutlined,
      permissions: ["purchase.purchase_history:view"],
      breadcrumb: false,
      submenu: []
    },
    {
      key: 'purchase-managment',
      path: `${APP_PREFIX_PATH}/purchase/purchase-managment`,
      title: 'purchase.purchase-managment',
      icon: UsergroupAddOutlined,
      permissions: ["purchase.supplier_managment:view"],
      breadcrumb: false,
      submenu: []
    },
    {
      key: 'purchase-settings',
      path: `${APP_PREFIX_PATH}/purchase/purchase-settings`,
      title: 'purchase.purchase-settings',
      icon: UsergroupAddOutlined,
      permissions: ["purchase.purchase_settings:view"],
      breadcrumb: false,
      submenu: []
    }
  ]
}]

const productionNavTree = [{
  key: 'production',
  path: `${APP_PREFIX_PATH}/production`,
  title: 'production.production',
  icon: BuildOutlined,
  breadcrumb: false,
  isGroupTitle: false,
  submenu: [
    {
      key: 'production',
      path: `${APP_PREFIX_PATH}/production`,
      title: 'production.production',
      icon: BuildOutlined,
      breadcrumb: false,
      permissions: ["production.cable_harness_assembly:view","production.box_build:vie"],
      submenu: []
    },
  ]
}]

const navigationConfig = [
  ...dashBoardNavTree,
  ...salesNavTree,
  ...workingOrderNavTree,
  ...inventoryNavTree,
  ...purchaseNavTree,
  ...productionNavTree,
  ...libraryNavTree,
  ...settingsNavTree
]

export default navigationConfig;
