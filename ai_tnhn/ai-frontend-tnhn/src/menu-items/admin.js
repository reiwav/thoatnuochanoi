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
      id: 'ai:chat',
      title: 'Hệ thống báo cáo',
      type: 'item',
      url: '/admin/ai-support',
      icon: icons.IconMessageChatbot,
      breadcrumbs: false
    },
    {
      title: 'Lượng mưa',
      type: 'collapse',
      icon: icons.IconCloudRain,
      children: [
        {
          id: 'rain:view',
          title: 'Bảng mưa',
          type: 'item',
          url: '/admin/station/rain/summary',
          icon: icons.IconTable,
          breadcrumbs: false
        },
        {
          id: 'rain:view',
          title: 'Danh sách',
          type: 'item',
          url: '/admin/station/rain/list',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'rain:view',
          title: 'So sánh mưa',
          type: 'item',
          url: '/admin/station/rain/compare',
          icon: icons.IconChartBar,
          breadcrumbs: false
        },
        {
          id: 'rain:view',
          title: 'Lịch sử',
          type: 'item',
          url: '/admin/station/rain/history',
          icon: icons.IconHistory,
          breadcrumbs: false
        },
      ]
    },
    {
      title: 'Điểm ngập',
      type: 'collapse',
      icon: icons.IconTornado,
      children: [
        {
          id: ['inundation:view', 'inundation:review'],
          title: 'Cập nhật điểm ngập',
          type: 'item',
          url: '/admin/inundation',
          icon: icons.IconTornado,
          breadcrumbs: false
        },
        {
          id: 'inundation:view',
          title: 'Danh sách',
          type: 'item',
          url: '/admin/station/inundation/list',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'inundation:view',
          title: 'Số liệu theo năm',
          type: 'item',
          url: '/admin/station/inundation/yearly',
          icon: icons.IconTable,
          breadcrumbs: false
        }
      ]
    },
    {
      title: 'Mực nước',
      type: 'collapse',
      icon: icons.IconRipple,
      children: [
        {
          id: 'water:view',
          title: 'Bảng sông hồ',
          type: 'item',
          url: '/admin/station/water/summary',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          title: 'Mực nước hồ',
          type: 'collapse',
          icon: icons.IconDroplets,
          children: [
            {
              id: 'water:view',
              title: 'Danh sách',
              type: 'item',
              url: '/admin/station/lake/list',
              icon: icons.IconList,
              breadcrumbs: false
            },
            {
              id: 'water:view',
              title: 'Lịch sử',
              type: 'item',
              url: '/admin/station/lake/history',
              icon: icons.IconHistory,
              breadcrumbs: false
            }
          ]
        },
        {
          title: 'Mực nước sông',
          type: 'collapse',
          icon: icons.IconDroplets,
          children: [{
            id: 'water:view',
            title: 'Danh sách',
            type: 'item',
            url: '/admin/station/river/list',
            icon: icons.IconList,
            breadcrumbs: false
          },
          {
            id: 'water:view',
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
      title: 'BC CT KC',
      type: 'collapse',
      icon: icons.IconAlertTriangle,
      children: [
        {
          id: 'emergency:view',
          title: 'Danh sách',
          type: 'item',
          url: '/admin/emergency-construction',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'emergency:view',
          title: 'Báo cáo',
          type: 'item',
          url: '/admin/emergency-construction/dashboard',
          icon: icons.IconClipboardList,
          breadcrumbs: false
        },
        {
          id: 'emergency:view',
          title: 'Lịch sử báo cáo',
          type: 'item',
          url: '/admin/emergency-construction/report-history',
          icon: icons.IconHistory,
          breadcrumbs: false
        },
      ]
    },
    {
      id: 'cuapai:view',
      title: 'Cửa phai',
      type: 'item',
      url: '/admin/cua-pai',
      icon: icons.IconDoor,
      breadcrumbs: false
    },
    {
      id: 'trambom:view',
      title: 'Trạm bơm',
      type: 'item',
      url: '/admin/tram-bom',
      icon: icons.IconEngine,
      breadcrumbs: false
    },
    {
      id: 'sa-hinh-ngap:view',
      title: 'Sa hình ngập',
      type: 'item',
      url: '/admin/sa-hinh-ngap',
      icon: icons.IconMap,
      breadcrumbs: false
    },
    {
      title: 'Hệ thống',
      type: 'collapse',
      icon: icons.IconUsers,
      children: [
        {
          id: 'employee:view',
          title: 'Tài khoản',
          type: 'item',
          url: '/admin/employee',
          icon: icons.IconUsers,
          breadcrumbs: false
        },
        {
          id: 'organization:view',
          title: 'Tạo đơn vị',
          type: 'item',
          url: '/admin/organization',
          icon: icons.IconBuilding,
          breadcrumbs: false
        },
        {
          id: 'role-matrix:view',
          title: 'Phân quyền',
          type: 'item',
          url: '/admin/role-matrix',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'role:view',
          title: 'Chức vụ',
          type: 'item',
          url: '/admin/role',
          icon: icons.IconUsers,
          breadcrumbs: false
        }
      ]
    },
    {
      title: 'Hợp đồng',
      type: 'collapse',
      icon: icons.IconClipboardList,
      children: [
        {
          id: 'contract-ai:chat',
          title: 'AI Trợ lý',
          type: 'item',
          url: '/admin/ai-contract',
          icon: icons.IconMessageChatbot,
          breadcrumbs: false
        },
        {
          id: 'contract:view',
          title: 'Danh sách HĐ',
          type: 'item',
          url: '/admin/contract',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'contract-category:view',
          title: 'Danh mục',
          type: 'item',
          url: '/admin/contract-category',
          icon: icons.IconList,
          breadcrumbs: false
        }
      ]
    },
  ]
};

export default adminPages;
