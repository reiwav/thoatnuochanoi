import {
  IconFaceId, IconUser, IconTornado, IconCloudRain, IconRipple,
  IconDroplets, IconMapPin, IconBuilding, IconUsers, IconList, IconHistory, IconAlertTriangle, IconMessageChatbot, IconClipboardList
} from '@tabler/icons-react';

const icons = {
  IconFaceId, IconUser, IconTornado, IconCloudRain, IconRipple,
  IconDroplets, IconMapPin, IconBuilding, IconUsers, IconList, IconHistory, IconAlertTriangle, IconMessageChatbot, IconClipboardList
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
          icon: icons.IconList,
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
        {
          id: 'station-rain-history',
          title: 'Lịch sử',
          type: 'item',
          url: '/admin/station/rain/history',
          icon: icons.IconHistory,
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'inundation-report',
      title: 'Điểm ngập lụt',
      type: 'item',
      url: '/admin/inundation',
      icon: icons.IconTornado,
      breadcrumbs: false,
      roles: ['employee']
    },
    {
      id: 'inundation-management',
      title: 'Điểm ngập úng',
      type: 'collapse',
      icon: icons.IconTornado,
      roles: ['super_admin'],
      children: [
        {
          id: 'inundation',
          title: 'Điểm ngập lụt',
          type: 'item',
          url: '/admin/inundation',
          icon: icons.IconTornado,
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
      title: 'Công trình khẩn',
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
