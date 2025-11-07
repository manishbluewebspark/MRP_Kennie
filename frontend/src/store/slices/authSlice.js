import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AUTH_TOKEN, REFRESH_TOKEN, USER_DETAILS } from 'constants/AuthConstant';
import AuthService from 'services/AuthService';
import FirebaseService from 'services/FirebaseService';

export const initialState = {
	loading: false,
	message: '',
	showMessage: false,
	redirect: '',
	token: localStorage.getItem(AUTH_TOKEN) || null,
	user: ''
}

// export const signIn = createAsyncThunk('auth/signIn',async (data, { rejectWithValue }) => {
// 	const { email, password } = data
// 	try {
// 		const response = await FirebaseService.signInEmailRequest(email, password)
// 		if (response.user) {
// 			const token = response.user.refreshToken;
// 			localStorage.setItem(AUTH_TOKEN, response.user.refreshToken);
// 			return token;
// 		} else {
// 			return rejectWithValue(response.message?.replace('Firebase: ', ''));
// 		}
// 	} catch (err) {
// 		return rejectWithValue(err.message || 'Error')
// 	}
// })

export const signIn = createAsyncThunk(
	"auth/signIn",
	async (data, { rejectWithValue }) => {
		try {
			const response = await AuthService.login(data);

			if (response.data && response.data.accessToken) {
				const { accessToken, refreshToken, user } = response.data;

				// ✅ localStorage me sab store karo
				localStorage.setItem(AUTH_TOKEN, accessToken);
				localStorage.setItem(REFRESH_TOKEN, refreshToken);
				localStorage.setItem(USER_DETAILS, JSON.stringify(user));

				return {
					token: accessToken,
					refreshToken,
					user,
					message: response.data.message || "Login successful",
				};
			} else {
				return rejectWithValue(response.data.message || "Invalid credentials");
			}
		} catch (err) {
			return rejectWithValue(
				err.response?.data?.message || err.message || "Error"
			);
		}
	}
);


export const signUp = createAsyncThunk('auth/signUp', async (data, { rejectWithValue }) => {
	const { email, password } = data
	try {
		const response = await FirebaseService.signUpEmailRequest(email, password)
		if (response.user) {
			const token = response.user.refreshToken;
			localStorage.setItem(AUTH_TOKEN, response.user.refreshToken);
			return token;
		} else {
			return rejectWithValue(response.message?.replace('Firebase: ', ''));
		}
	} catch (err) {
		return rejectWithValue(err.message || 'Error')
	}
})

// export const signOut = createAsyncThunk('auth/signOut',async () => {
//     const response = await FirebaseService.signOutRequest()
// 	localStorage.removeItem(AUTH_TOKEN);
//     return response.data
// })

export const signOut = createAsyncThunk(
	"auth/signOut",
	async (_, { rejectWithValue }) => {
		try {
			await AuthService.logout(); // backend call

			// ✅ localStorage clear
			localStorage.removeItem(AUTH_TOKEN);
			localStorage.removeItem(REFRESH_TOKEN);
			localStorage.removeItem(USER_DETAILS);

			return { success: true, message: "Logged out successfully" };
		} catch (err) {
			// Agar backend fail bhi ho jaye, phir bhi frontend clear karenge
			localStorage.removeItem(AUTH_TOKEN);
			localStorage.removeItem(REFRESH_TOKEN);
			localStorage.removeItem(USER_DETAILS);
			return rejectWithValue(err.response?.data?.message || err.message || "Logout failed");
		}
	}
);

export const forgotPassword = createAsyncThunk(
	"auth/forgotPassword",
	async (data, { rejectWithValue }) => {
		try {
			const response = await AuthService.forgotPassword(data);
			return response; // ab payload me sirf { message, data } hoga
		} catch (err) {
			return rejectWithValue(err.message || "Something went wrong");
		}
	}
);



export const verifyOtp = createAsyncThunk(
	'auth/verifyOtp',
	async (data, { rejectWithValue }) => {
		try {
			const response = await AuthService.verifyOtp(data);
			// response should have success/message/data
			if (!response.success) {
				return rejectWithValue(response.message);
			}
			return response; // { success: true, message, data }
		} catch (err) {
			return rejectWithValue(err.response?.data?.message || err.message);
		}
	}
);

export const editProfile = createAsyncThunk(
	"auth/editProfile",
	async (formData, { rejectWithValue }) => {
		try {
			const response = await AuthService.updateProfile(formData);
			if (!response.success) {
				return rejectWithValue(response.message);
			}
			return response; // { success, message, data:{ user } }
		} catch (err) {
			return rejectWithValue(err.response?.data?.message || err.message);
		}
	}
);

export const updatePassword = createAsyncThunk(
	"auth/updatePassword",
	async (data, { rejectWithValue }) => {
		try {
			const response = await AuthService.updatePassword(data);
			if (!response.success) {
				return rejectWithValue(response.message);
			}
			return response.message;
		} catch (err) {
			return rejectWithValue(err.response?.data?.message || err.message);
		}
	}
);


// 3️⃣ Resend OTP
export const resendOtp = createAsyncThunk(
	'auth/resendOtp',
	async (data, { rejectWithValue }) => {
		try {
			const response = await AuthService.resendOtp(data);
			return response; // { message: "New OTP sent" }
		} catch (err) {
			return rejectWithValue(err.response?.data?.message || err.message);
		}
	}
);

// 4️⃣ Reset Password
export const resetPassword = createAsyncThunk(
	'auth/resetPassword',
	async (data, { rejectWithValue }) => {
		try {
			const response = await AuthService.resetPassword(data);
			return response; // { message: "Password reset successfully" }
		} catch (err) {
			return rejectWithValue(err.response?.data?.message || err.message);
		}
	}
);

export const fetchCurrentUser = createAsyncThunk(
	'auth/fetchCurrentUser',
	async (_, { rejectWithValue }) => {
		try {
			const response = await AuthService.getMe();
			return response.user; // { user object }
		} catch (err) {
			return rejectWithValue(err.response?.data?.message || err.message);
		}
	}
);

export const signInWithGoogle = createAsyncThunk('auth/signInWithGoogle', async (_, { rejectWithValue }) => {
	const response = await FirebaseService.signInGoogleRequest()
	if (response.user) {
		const token = response.user.refreshToken;
		localStorage.setItem(AUTH_TOKEN, response.user.refreshToken);
		return token;
	} else {
		return rejectWithValue(response.message?.replace('Firebase: ', ''));
	}
})

export const signInWithFacebook = createAsyncThunk('auth/signInWithFacebook', async (_, { rejectWithValue }) => {
	const response = await FirebaseService.signInFacebookRequest()
	if (response.user) {
		const token = response.user.refreshToken;
		localStorage.setItem(AUTH_TOKEN, response.user.refreshToken);
		return token;
	} else {
		return rejectWithValue(response.message?.replace('Firebase: ', ''));
	}
})


export const authSlice = createSlice({
	name: 'auth',
	initialState,
	reducers: {
		authenticated: (state, action) => {
			state.loading = false
			state.redirect = '/'
			state.token = action.payload
		},
		showAuthMessage: (state, action) => {
			state.message = action.payload
			state.showMessage = true
			state.loading = false
		},
		hideAuthMessage: (state) => {
			state.message = ''
			state.showMessage = false
		},
		signOutSuccess: (state) => {
			state.loading = false
			state.token = null
			state.redirect = '/'
		},
		showLoading: (state) => {
			state.loading = true
		},
		signInSuccess: (state, action) => {
			state.loading = false
			state.token = action.payload
		}
	},
	extraReducers: (builder) => {
		builder
			.addCase(signIn.pending, (state) => {
				state.loading = true
			})
			.addCase(signIn.fulfilled, (state, action) => {
				state.loading = false;
				state.token = action.payload.token;
				state.refreshToken = action.payload.refreshToken;
				state.user = action.payload.user;
				state.message = action.payload.message;
				state.showMessage = true;
			})
			.addCase(signOut.fulfilled, (state, action) => {
				state.loading = false;
				state.token = null;
				state.refreshToken = null;
				state.user = null;
				state.message = action.payload?.message || "Logged out successfully";
				state.showMessage = true;
				state.redirect = "/login";
			})

			.addCase(signIn.rejected, (state, action) => {
				state.message = action.payload
				state.showMessage = true
				state.loading = false
			})

			.addCase(signOut.rejected, (state) => {
				state.loading = false
				state.token = null
				state.redirect = '/'
			})
			.addCase(signUp.pending, (state) => {
				state.loading = true
			})
			.addCase(signUp.fulfilled, (state, action) => {
				state.loading = false
				state.redirect = '/'
				state.token = action.payload
			})
			.addCase(signUp.rejected, (state, action) => {
				state.message = action.payload
				state.showMessage = true
				state.loading = false
			})
			.addCase(signInWithGoogle.pending, (state) => {
				state.loading = true
			})
			.addCase(signInWithGoogle.fulfilled, (state, action) => {
				state.loading = false
				state.redirect = '/'
				state.token = action.payload
			})
			.addCase(signInWithGoogle.rejected, (state, action) => {
				state.message = action.payload
				state.showMessage = true
				state.loading = false
			})
			.addCase(signInWithFacebook.pending, (state) => {
				state.loading = true
			})
			.addCase(signInWithFacebook.fulfilled, (state, action) => {
				state.loading = false
				state.redirect = '/'
				state.token = action.payload
			})
			.addCase(signInWithFacebook.rejected, (state, action) => {
				state.message = action.payload
				state.showMessage = true
				state.loading = false
			})
			.addCase(forgotPassword.pending, (state) => { state.loading = true; })
			.addCase(forgotPassword.fulfilled, (state, action) => {
				state.loading = false;
				state.message = action.payload.message;
				state.showMessage = true;
			})
			.addCase(forgotPassword.rejected, (state, action) => {
				state.loading = false;
				state.message = action.payload;
				state.showMessage = true;
			})

			// Verify OTP
			.addCase(verifyOtp.pending, (state) => { state.loading = true; })
			.addCase(verifyOtp.fulfilled, (state, action) => {
				state.loading = false;
				state.message = action.payload.message;
				state.showMessage = true;
			})
			.addCase(verifyOtp.rejected, (state, action) => {
				state.loading = false;
				state.message = action.payload;
				state.showMessage = true;
			})

			// Resend OTP
			.addCase(resendOtp.pending, (state) => { state.loading = true; })
			.addCase(resendOtp.fulfilled, (state, action) => {
				state.loading = false;
				state.message = action.payload.message;
				state.showMessage = true;
			})
			.addCase(resendOtp.rejected, (state, action) => {
				state.loading = false;
				state.message = action.payload;
				state.showMessage = true;
			})

			// Reset Password
			.addCase(resetPassword.pending, (state) => { state.loading = true; })
			.addCase(resetPassword.fulfilled, (state, action) => {
				state.loading = false;
				state.message = action.payload.message;
				state.showMessage = true;
			})
			.addCase(resetPassword.rejected, (state, action) => {
				state.loading = false;
				state.message = action.payload;
				state.showMessage = true;
			})
			.addCase(editProfile.pending, (state) => { state.loading = true; })
			.addCase(editProfile.fulfilled, (state, action) => {
				state.loading = false;
				state.message = action.payload.message;
				state.showMessage = true;
				// update redux user
				if (action.payload.data?.user) state.user = action.payload.data.user;
			})
			.addCase(editProfile.rejected, (state, action) => {
				state.loading = false;
				state.message = action.payload || "Profile update failed";
				state.showMessage = true;
			})
			.addCase(fetchCurrentUser.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchCurrentUser.fulfilled, (state, action) => {
				state.loading = false;
				state.user = action.payload;
			})
			.addCase(fetchCurrentUser.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(updatePassword.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(updatePassword.fulfilled, (state) => {
				state.loading = false;
			})
			.addCase(updatePassword.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
	},
})

export const {
	authenticated,
	showAuthMessage,
	hideAuthMessage,
	signOutSuccess,
	showLoading,
	signInSuccess
} = authSlice.actions

export default authSlice.reducer