import {
  IconFaceId, IconUser, IconCloudRain, IconRipple, IconTable, IconChartBar,
  IconDroplets, IconMapPin, IconBuilding, IconUsers, IconList, IconHistory, IconAlertTriangle, IconMessageChatbot, IconClipboardList,
  IconDoor, IconEngine, IconMap, IconTornado, IconClipboardCheck
} from '@tabler/icons-react';

const icons = {
  IconFaceId, IconUser, IconCloudRain, IconRipple, IconTable, IconChartBar,
  IconDroplets, IconMapPin, IconBuilding, IconUsers, IconList, IconHistory, IconAlertTriangle, IconMessageChatbot, IconClipboardList,
  IconDoor, IconEngine, IconMap, IconTornado, IconClipboardCheck
};

const companyPages = {
  id: 'company-tasks',
  title: 'CÔNG VIỆC HIỆN TRƯỜNG',
  type: 'group',
  children: [
    {
      id: 'company:inundation',
      permission: ['inundation:survey', 'inundation:mechanic', 'inundation:review', 'inundation:view'],
      title: 'Điểm trực ngập',
      type: 'item',
      url: '/company/inundation',
      icon: icons.IconTornado,
      breadcrumbs: false
    },
    {
      id: 'company:trambom',
      permission: 'trambom:view',
      title: 'Trạm bơm',
      type: 'item',
      url: '/company/tram-bom',
      icon: icons.IconEngine,
      breadcrumbs: false
    }
  ]
};

const adminPages = {
  id: 'admin',
  title: 'QUẢN TRỊ',
  type: 'group',
  permission: 'ai:chat', // Base permission for the group
  children: [
    {
      id: 'ai:chat',
      permission: 'ai:chat',
      title: 'Hệ thống báo cáo',
      type: 'item',
      url: '/admin/ai-support',
      icon: icons.IconMessageChatbot,
      breadcrumbs: false
    },
    {
      id: 'rain',
      permission: 'rain:view',
      title: 'Lượng mưa',
      type: 'collapse',
      icon: icons.IconCloudRain,
      children: [
        {
          id: 'rain:view-summary',
          permission: 'rain:view',
          title: 'Bảng mưa',
          type: 'item',
          url: '/admin/station/rain/summary',
          icon: icons.IconTable,
          breadcrumbs: false
        },
        {
          id: 'rain:view-list',
          permission: 'rain:view',
          title: 'Danh sách',
          type: 'item',
          url: '/admin/station/rain/list',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'rain:view-compare',
          permission: 'rain:view',
          title: 'So sánh mưa',
          type: 'item',
          url: '/admin/station/rain/compare',
          icon: icons.IconChartBar,
          breadcrumbs: false
        },
        {
          id: 'rain:view-history',
          permission: 'rain:view',
          title: 'Lịch sử',
          type: 'item',
          url: '/admin/station/rain/history',
          icon: icons.IconHistory,
          breadcrumbs: false
        },
      ]
    },
    {
      id: 'inundation',
      permission: 'inundation:view',
      title: 'Điểm ngập',
      type: 'collapse',
      icon: icons.IconTornado,
      children: [
        {
          id: 'inundation:dashboard',
          permission: ['inundation:view', 'inundation:review', 'inundation:survey', 'inundation:mechanic', 'inundation:report'],
          title: 'Cập nhật điểm ngập',
          type: 'item',
          url: '/admin/inundation',
          icon: icons.IconTornado,
          breadcrumbs: false
        },
        {
          id: 'inundation:list',
          permission: 'inundation:view',
          title: 'Danh sách',
          type: 'item',
          url: '/admin/station/inundation/list',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'inundation:yearly',
          permission: 'inundation:view',
          title: 'Số liệu theo năm',
          type: 'item',
          url: '/admin/station/inundation/yearly',
          icon: icons.IconTable,
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'water',
      permission: 'water:view',
      title: 'Mực nước',
      type: 'collapse',
      icon: icons.IconRipple,
      children: [
        {
          id: 'water:summary',
          permission: 'water:view',
          title: 'Bảng sông hồ',
          type: 'item',
          url: '/admin/station/water/summary',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'lake',
          permission: 'water:view',
          title: 'Mực nước hồ',
          type: 'collapse',
          icon: icons.IconDroplets,
          children: [
            {
              id: 'water:lake-list',
              permission: 'water:view',
              title: 'Danh sách',
              type: 'item',
              url: '/admin/station/lake/list',
              icon: icons.IconList,
              breadcrumbs: false
            },
            {
              id: 'water:lake-history',
              permission: 'water:view',
              title: 'Lịch sử',
              type: 'item',
              url: '/admin/station/lake/history',
              icon: icons.IconHistory,
              breadcrumbs: false
            }
          ]
        },
        {
          id: 'river',
          permission: 'water:view',
          title: 'Mực nước sông',
          type: 'collapse',
          icon: icons.IconDroplets,
          children: [{
            id: 'water:river-list',
            permission: 'water:view',
            title: 'Danh sách',
            type: 'item',
            url: '/admin/station/river/list',
            icon: icons.IconList,
            breadcrumbs: false
          },
          {
            id: 'water:river-history',
            permission: 'water:view',
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
      id: 'emergency',
      permission: 'emergency:view',
      title: 'BC CT KC',
      type: 'collapse',
      icon: icons.IconAlertTriangle,
      children: [
        {
          id: 'emergency:list',
          permission: 'emergency:view',
          title: 'Danh sách',
          type: 'item',
          url: '/admin/emergency-construction',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'emergency:dashboard',
          permission: 'emergency:view',
          title: 'Báo cáo',
          type: 'item',
          url: '/admin/emergency-construction/dashboard',
          icon: icons.IconClipboardList,
          breadcrumbs: false
        },
        {
          id: 'emergency:history',
          permission: 'emergency:view',
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
      permission: ['cuapai:view', 'cuapai:control'],
      title: 'Cửa phai',
      type: 'item',
      url: '/admin/cua-pai',
      icon: icons.IconDoor,
      breadcrumbs: false
    },
    {
      id: 'admin:trambom',
      permission: ['trambom:view', 'trambom:control', 'trambom:edit'],
      title: 'Trạm bơm',
      type: 'item',
      url: '/admin/tram-bom',
      icon: icons.IconEngine,
      breadcrumbs: false
    },
    {
      id: 'sa-hinh-ngap:view',
      permission: 'sa-hinh-ngap:view',
      title: 'Sa hình ngập',
      type: 'item',
      url: '/admin/sa-hinh-ngap',
      icon: icons.IconMap,
      breadcrumbs: false
    },
    {
      id: 'system',
      permission: 'employee:view',
      title: 'Hệ thống',
      type: 'collapse',
      icon: icons.IconUsers,
      children: [
        {
          id: 'employee:view',
          permission: 'employee:view',
          title: 'Tài khoản',
          type: 'item',
          url: '/admin/employee',
          icon: icons.IconUsers,
          breadcrumbs: false
        },
        {
          id: 'organization:view',
          permission: 'organization:view',
          title: 'Tạo đơn vị',
          type: 'item',
          url: '/admin/organization',
          icon: icons.IconBuilding,
          breadcrumbs: false
        },
        {
          id: 'role-matrix:view',
          permission: 'role-matrix:view',
          title: 'Phân quyền',
          type: 'item',
          url: '/admin/role-matrix',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'role:view',
          permission: 'role:view',
          title: 'Chức vụ',
          type: 'item',
          url: '/admin/role',
          icon: icons.IconUsers,
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'contract',
      permission: 'contract:view',
      title: 'Hợp đồng',
      type: 'collapse',
      icon: icons.IconClipboardList,
      children: [
        {
          id: 'contract-ai:chat',
          permission: 'contract-ai:chat',
          title: 'AI Trợ lý',
          type: 'item',
          url: '/admin/ai-contract',
          icon: icons.IconMessageChatbot,
          breadcrumbs: false
        },
        {
          id: 'contract:view',
          permission: 'contract:view',
          title: 'Danh sách HĐ',
          type: 'item',
          url: '/admin/contract',
          icon: icons.IconList,
          breadcrumbs: false
        },
        {
          id: 'contract-category:view',
          permission: 'contract-category:view',
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

export { adminPages, companyPages };
export default adminPages;
