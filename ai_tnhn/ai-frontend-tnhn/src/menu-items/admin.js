import {
  IconFaceId, IconUser, IconCloudRain, IconRipple, IconTable, IconChartBar,
  IconDroplets, IconMapPin, IconBuilding, IconUsers, IconList, IconHistory, IconAlertTriangle, IconMessageChatbot, IconClipboardList,
  IconDoor, IconEngine, IconMap, IconTornado
} from '@tabler/icons-react';

const icons = {
  IconFaceId, IconUser, IconCloudRain, IconRipple, IconTable, IconChartBar,
  IconDroplets, IconMapPin, IconBuilding, IconUsers, IconList, IconHistory, IconAlertTriangle, IconMessageChatbot, IconClipboardList,
  IconDoor, IconEngine, IconMap, IconTornado
};

const adminPages = {
  id: 'admin',
  title: 'QUẢN TRỊ',
  type: 'group',
  children: [
    {
      id: 'ai-support',
      title: 'HSDC AI',
      type: 'item',
      url: '/admin/ai-support',
      icon: icons.IconMessageChatbot,
      breadcrumbs: false,
      roles: ['super_admin']
    },
    {
      id: 'rain-management',
      title: 'Lượng mưa',
      type: 'collapse',
      icon: icons.IconCloudRain,
      roles: ['super_admin'],
      children: [
        {
          id: 'station-rain-summary',
          title: 'Bảng mưa',
          type: 'item',
          url: '/admin/station/rain/summary',
          icon: icons.IconTable,
          breadcrumbs: false
        },
        {
          id: 'station-rain-compare',
          title: 'So sánh mưa',
          type: 'item',
          url: '/admin/station/rain/compare',
          icon: icons.IconChartBar,
          breadcrumbs: false
        },
        {
          id: 'station-rain-history',
          title: 'Lịch sử',
          type: 'item',
          url: '/admin/station/rain/history',
          icon: icons.IconHistory,
          breadcrumbs: false
        },
        {
          id: 'station-rain-list',
          title: 'Danh sách',
          type: 'item',
          url: '/admin/station/rain/list',
          icon: icons.IconList,
          breadcrumbs: false
        },

      ]
    },
    {
      id: 'inundation-report',
      title: 'Điểm ngập',
      type: 'item',
      url: '/admin/inundation',
      icon: icons.IconTornado,
      breadcrumbs: false,
      roles: ['employee']
    },
    {
      id: 'inundation-management',
      title: 'Điểm ngập',
      type: 'collapse',
      icon: icons.IconTornado,
      roles: ['super_admin'],
      children: [
        {
          id: 'inundation',
          title: 'Điểm ngập',
          type: 'item',
          url: '/admin/inundation',
          icon: icons.IconTornado,
          breadcrumbs: false,
        },
        {
          id: 'inundation-list',
          title: 'Quản lý báo cáo',
          type: 'item',
          url: '/admin/inundation-list',
          icon: icons.IconList,
          breadcrumbs: false,
        },
        {
          id: 'station-inundation-history',
          title: 'Lịch sử',
          type: 'item',
          url: '/admin/station/inundation/history',
          icon: icons.IconHistory,
          breadcrumbs: false
        }, {
          id: 'station-inundation-list',
          title: 'Danh sách',
          type: 'item',
          url: '/admin/station/inundation/list',
          icon: icons.IconList,
          breadcrumbs: false
        },
      ]
    },
    {
      id: 'emergency-construction-report',
      title: 'Công trình khẩn cấp',
      type: 'item',
      url: '/admin/emergency-construction/dashboard',
      icon: icons.IconAlertTriangle,
      breadcrumbs: false,
      roles: ['employee']
    },
    {
      id: 'river-management',
      title: 'Mực nước',
      type: 'collapse',
      icon: icons.IconRipple,
      roles: ['super_admin'],
      children: [
        {
          id: 'station-water-summary',
          title: 'Bảng sông hồ',
          type: 'item',
          url: '/admin/station/water/summary',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'lake-management',
          title: 'Mực nước hồ',
          type: 'collapse',
          icon: icons.IconDroplets,
          roles: ['super_admin'],
          children: [
            {
              id: 'station-lake-list',
              title: 'Danh sách',
              type: 'item',
              url: '/admin/station/lake/list',
              icon: icons.IconList,
              breadcrumbs: false
            },
            {
              id: 'station-lake-history',
              title: 'Lịch sử',
              type: 'item',
              url: '/admin/station/lake/history',
              icon: icons.IconHistory,
              breadcrumbs: false
            }
          ]
        },
        {
          id: 'river-management',
          title: 'Mực nước sông',
          type: 'collapse',
          icon: icons.IconDroplets,
          roles: ['super_admin'],
          children: [{
            id: 'station-river-list',
            title: 'Danh sách',
            type: 'item',
            url: '/admin/station/river/list',
            icon: icons.IconList,
            breadcrumbs: false
          },
          {
            id: 'station-river-history',
            title: 'Lịch sử',
            type: 'item',
            url: '/admin/station/river/history',
            icon: icons.IconHistory,
            breadcrumbs: false
          }]
        }
      ]
    },


    {
      id: 'emergency-construction',
      title: 'Công trình khẩn cấp (ĐPT)',
      type: 'collapse',
      icon: icons.IconAlertTriangle,
      roles: ['super_admin'],
      children: [
        {
          id: 'emergency-construction-list',
          title: 'Danh sách',
          type: 'item',
          url: '/admin/emergency-construction',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'emergency-construction-history',
          title: 'Lịch sử báo cáo',
          type: 'item',
          url: '/admin/emergency-construction/dashboard?activeTab=2',
          icon: icons.IconHistory,
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'cua-pai',
      title: 'Cửa phai (ĐPT)',
      type: 'item',
      url: '/admin/cua-pai',
      icon: icons.IconDoor,
      breadcrumbs: false,
      roles: ['super_admin']
    },
    {
      id: 'tram-bo',
      title: 'Trạm bơm (ĐPT)',
      type: 'item',
      url: '/admin/tram-bo',
      icon: icons.IconEngine,
      breadcrumbs: false,
      roles: ['super_admin']
    },
    {
      id: 'sa-hinh-ngap',
      title: 'Sa hình ngập (ĐPT)',
      type: 'item',
      url: '/admin/sa-hinh-ngap',
      icon: icons.IconMap,
      breadcrumbs: false,
      roles: ['super_admin']
    },
    {
      id: 'employee-list',
      title: 'Tài khoản',
      type: 'item',
      url: '/admin/employee',
      icon: icons.IconUsers,
      breadcrumbs: false,
      roles: ['super_admin', 'admin_org']
    },
    {
      id: 'organization-list',
      title: 'Phân quyền (ĐPT)',
      type: 'item',
      url: '/admin/organization',
      icon: icons.IconBuilding,
      breadcrumbs: false,
      roles: ['super_admin']
    },
  ]
};

export default adminPages;
