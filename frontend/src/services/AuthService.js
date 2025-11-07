import fetch from 'auth/FetchInterceptor'

const AuthService = {}

AuthService.login = function (data) {
	return fetch({
		url: '/auth/login',
		method: 'post',
		data: data
	})
}

AuthService.register = function (data) {
	return fetch({
		url: '/auth/register',
		method: 'post',
		data: data
	})
}

AuthService.forgotPassword = function(data) {
  return fetch({
    url: '/auth/forgot-password',
    method: 'post',
    data: data
  });
}

AuthService.getMe = function() {
  return fetch({
    url: '/auth/me',
    method: 'get'
  });
};

// resend OTP
AuthService.resendOtp = function(data) {
  return fetch({
    url: '/auth/resend-otp',
    method: 'post',
    data: data
  });
}

// verify OTP
AuthService.verifyOtp = function(data) {
  return fetch({
    url: '/auth/verify-otp',
    method: 'post',
    data: data
  });
}

// reset password
AuthService.resetPassword = function(data) {
  return fetch({
    url: '/auth/reset-password',
    method: 'post',
    data: data
  });
}

AuthService.updatePassword = function(data) {
  return fetch({
    url: '/auth/update-password',
    method: 'post',
    data: data
  });
};


AuthService.updateProfile = function(data) {
  // data: FormData instance (image + fields)
  return fetch({
    url: '/auth/profile',
    method: 'patch',
    data: data,
    headers: { 'Content-Type': 'multipart/form-data' } // image ke liye
  });
};

AuthService.logout = async function () {
  try {
    const refreshToken = localStorage.getItem("refreshToken"); // ya jo aap store kar rahe ho

    await fetch({
      url: "/auth/logout",
      method: "post",
      data: { refreshToken }, // backend ke liye
    });

    // Local session clear
    localStorage.clear();

    return { success: true, message: "Logged out successfully" };
  } catch (error) {
    // Agar API fail bhi ho, tab bhi frontend clear karenge
    localStorage.clear();
    throw error;
  }
};


export default AuthService;