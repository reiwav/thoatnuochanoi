import {
  IconFaceId, IconUser, IconTornado, IconCloudRain, IconRipple,
  IconDroplets, IconMapPin, IconBuilding, IconUsers, IconList, IconHistory, IconAlertTriangle, IconMessageChatbot
} from '@tabler/icons-react';

const icons = {
  IconFaceId, IconUser, IconTornado, IconCloudRain, IconRipple,
  IconDroplets, IconMapPin, IconBuilding, IconUsers, IconList, IconHistory, IconAlertTriangle, IconMessageChatbot
};

const adminPages = {
  id: 'admin',
  title: 'QUẢN TRỊ',
  type: 'group',
  children: [
    {
      id: 'inundation-report',
      title: 'Trực ngập lụt',
      type: 'item',
      url: '/admin/inundation',
      icon: icons.IconTornado,
      breadcrumbs: false
    },
    {
      id: 'emergency-construction-report',
      title: 'Công trình khẩn',
      type: 'item',
      url: '/admin/emergency-construction/dashboard',
      icon: icons.IconAlertTriangle,
      breadcrumbs: false
    },
    {
      id: 'organization-list',
      title: 'Tổ chức',
      type: 'item',
      url: '/admin/organization',
      icon: icons.IconBuilding,
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
      id: 'rain-management',
      title: 'Lượng mưa',
      type: 'collapse',
      icon: icons.IconCloudRain,
      children: [
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
      id: 'river-management',
      title: 'Mực nước sông',
      type: 'collapse',
      icon: icons.IconRipple,
      children: [
        {
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
        }
      ]
    },
    {
      id: 'lake-management',
      title: 'Mực nước hồ',
      type: 'collapse',
      icon: icons.IconDroplets,
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
      id: 'inundation-management',
      title: 'Điểm ngập úng',
      type: 'collapse',
      icon: icons.IconAlertTriangle,
      children: [
        {
          id: 'station-inundation-list',
          title: 'Danh sách',
          type: 'item',
          url: '/admin/station/inundation/list',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'station-inundation-history',
          title: 'Lịch sử',
          type: 'item',
          url: '/admin/station/inundation/history',
          icon: icons.IconHistory,
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'emergency-construction',
      title: 'Công trình khẩn cấp',
      type: 'item',
      url: '/admin/emergency-construction',
      icon: icons.IconAlertTriangle,
      breadcrumbs: false
    },
    {
      id: 'ai-support',
      title: 'Hỗ trợ AI',
      type: 'item',
      url: '/admin/ai-support',
      icon: icons.IconMessageChatbot,
      breadcrumbs: false
    }
  ]
};

export default adminPages;
