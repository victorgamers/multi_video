import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import VideoMonitor from '../views/VideoMonitor.vue'
import Strategy from '../views/Strategy.vue'
import Alarm from '../views/Alarm.vue'
import UserManage from '../views/UserManage.vue'
import LogMonitor from '../views/LogMonitor.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/video',
    name: 'VideoMonitor',
    component: VideoMonitor
  },
  {
    path: '/strategy',
    name: 'Strategy',
    component: Strategy
  },
  {
    path: '/alarm',
    name: 'Alarm',
    component: Alarm
  },
  {
    path: '/users',
    name: 'UserManage',
    component: UserManage
  },
  {
    path: '/logs',
    name: 'LogMonitor',
    component: LogMonitor
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
