import axios from 'axios';
import { API_BASE_URL } from 'configs/AppConfig';
import { signOutSuccess } from 'store/slices/authSlice';
import store from '../store';
import { AUTH_TOKEN } from 'constants/AuthConstant';
import { notification } from 'antd';

const unauthorizedCode = [401, 403]

const service = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000
})

// Config
const TOKEN_PAYLOAD_KEY = 'authorization'

// API Request interceptor
service.interceptors.request.use(config => {
	const jwtToken = localStorage.getItem(AUTH_TOKEN) || null;
	
	// if (jwtToken) {
	// 	config.headers[TOKEN_PAYLOAD_KEY] = jwtToken
	// }
	if (jwtToken) {
    config.headers[TOKEN_PAYLOAD_KEY] = `Bearer ${jwtToken}`
}


  	return config
}, error => {
	// Do something with request error here
	notification.error({
		message: 'Error'
	})
	Promise.reject(error)
})

// API respone interceptor
// service.interceptors.response.use( (response) => {
// 	return response.data
// }, (error) => {

// 	let notificationParam = {
// 		message: ''
// 	}
 
// 	// Remove token and redirect 
// 	if (unauthorizedCode.includes(error.response.status)) {
// 		notificationParam.message = 'Authentication Fail'
// 		notificationParam.description = 'Please login again'
// 		localStorage.removeItem(AUTH_TOKEN)
// 		store.dispatch(signOutSuccess())
// 	}

// 	if (error.response.status === 404) {
// 		notificationParam.message = 'Not Found'
// 	}

// 	if (error.response.status === 500) {
// 		notificationParam.message = 'Internal Server Error'
// 	}
	
// 	if (error.response.status === 508) {
// 		notificationParam.message = 'Time Out'
// 	}

// 	notification.error(notificationParam)

// 	return Promise.reject(error);
// });
// service.interceptors.response.use(
//   response => response.data,
//   (error) => {
//     const status = error.response?.status;
//     const msg = error.response?.data?.message || '';

//     if (!status) {
//       // Network / unknown error
//       notification.error({
//         message: "Network Error",
//         description: error.message || "Please check your connection",
//         placement: "topRight",
//       });
//       return Promise.reject(error);
//     }

//     // Unauthorized
//     if ([401,403].includes(status)) {
//       notification.error({
//         message: "Authentication Fail",
//         description: "Please login again",
//         placement: "topRight",
//       });
//       localStorage.removeItem(AUTH_TOKEN);
//       store.dispatch(signOutSuccess());
//       return Promise.reject(error);
//     }

//     // Handle specific status
//     if (status === 400) {
//       notification.error({
//         message: "Bad Request",
//         description: msg || "Invalid input",
//         placement: "topRight",
//       });
//     } else if (status === 404) {
//       notification.error({
//         message: "Not Found",
//         description: msg || "Resource not found",
//         placement: "topRight",
//       });
//     } else if (status === 500) {
//       notification.error({
//         message: "Internal Server Error",
//         description: msg || "Something went wrong on server",
//         placement: "topRight",
//       });
//     } else if (status === 508) {
//       notification.error({
//         message: "Timeout",
//         description: msg || "Request timed out",
//         placement: "topRight",
//       });
//     }

//     return Promise.reject(error);
//   }
// );

service.interceptors.response.use(
  (response) => {
    const rt = response.config?.responseType;
    // For binary types, return the FULL axios response (keep headers, status, etc.)
    if (rt === 'arraybuffer' || rt === 'blob') {
      return response;
    }
    // Default JSON/text APIs can still return data only
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const msg = error.response?.data?.message || '';

    if (!status) {
      notification.error({
        message: "Network Error",
        description: error.message || "Please check your connection",
        placement: "topRight",
      });
      return Promise.reject(error);
    }

    if ([401, 403].includes(status)) {
      notification.error({
        message: "Authentication Fail",
        description: "Please login again",
        placement: "topRight",
      });
      localStorage.removeItem(AUTH_TOKEN);
      store.dispatch(signOutSuccess());
      return Promise.reject(error);
    }

    if (status === 400) {
      notification.error({ message: "Bad Request", description: msg || "Invalid input", placement: "topRight" });
    } else if (status === 404) {
      notification.error({ message: "Not Found", description: msg || "Resource not found", placement: "topRight" });
    } else if (status === 500) {
      notification.error({ message: "Internal Server Error", description: msg || "Something went wrong on server", placement: "topRight" });
    } else if (status === 508) {
      notification.error({ message: "Timeout", description: msg || "Request timed out", placement: "topRight" });
    }

    return Promise.reject(error);
  }
);



export default service