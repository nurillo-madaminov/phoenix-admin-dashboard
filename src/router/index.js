import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "@/lib/supabase";

import Login from "../views/Login.vue";
import DashboardView from "../views/DashboardView.vue";

const routes = [
  {
    path: "/",
    name: "login",
    component: Login,
    meta: { requiresGuest: true }
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: DashboardView,
    meta: { requiresAuth: true }
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const { data } = await supabase.auth.getSession();
  const isLoggedIn = !!data.session;

  // protect dashboard
  if (to.meta.requiresAuth && !isLoggedIn) {
    return "/";
  }

  // prevent logged users from opening login
  if (to.meta.requiresGuest && isLoggedIn) {
    return "/dashboard";
  }
});


export default router;
