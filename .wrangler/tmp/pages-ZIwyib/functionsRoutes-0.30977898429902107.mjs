import { onRequestPost as __api_check_code_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\check-code.js"
import { onRequestPost as __api_forgot_password_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\forgot-password.js"
import { onRequestPost as __api_login_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\login.js"
import { onRequestPost as __api_logout_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\logout.js"
import { onRequestGet as __api_matrix_data_js_onRequestGet } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\matrix-data.js"
import { onRequestPost as __api_register_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\register.js"
import { onRequestPost as __api_reset_password_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\reset-password.js"
import { onRequestGet as __api_session_js_onRequestGet } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\session.js"
import { onRequestPost as __api_settings_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\settings.js"
import { onRequestPost as __api_verify_js_onRequestPost } from "C:\\Users\\User\\Documents\\Project\\skill_matrix\\functions\\api\\verify.js"

export const routes = [
    {
      routePath: "/api/check-code",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_check_code_js_onRequestPost],
    },
  {
      routePath: "/api/forgot-password",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_forgot_password_js_onRequestPost],
    },
  {
      routePath: "/api/login",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_login_js_onRequestPost],
    },
  {
      routePath: "/api/logout",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_logout_js_onRequestPost],
    },
  {
      routePath: "/api/matrix-data",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_matrix_data_js_onRequestGet],
    },
  {
      routePath: "/api/register",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_register_js_onRequestPost],
    },
  {
      routePath: "/api/reset-password",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_reset_password_js_onRequestPost],
    },
  {
      routePath: "/api/session",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_session_js_onRequestGet],
    },
  {
      routePath: "/api/settings",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_settings_js_onRequestPost],
    },
  {
      routePath: "/api/verify",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_verify_js_onRequestPost],
    },
  ]