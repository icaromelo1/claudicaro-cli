import { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/ChatPage.vue') },
      { path: 'health', component: () => import('pages/HealthPage.vue') },
      { path: 'settings', component: () => import('pages/SettingsPage.vue') },
      { path: 'workflow', component: () => import('pages/WorkflowPage.vue') },
    ]
  },
  {
    path: '/auth',
    component: () => import('pages/LoginPage.vue'),
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
