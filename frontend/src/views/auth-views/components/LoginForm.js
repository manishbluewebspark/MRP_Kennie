// import React, { useEffect } from 'react';
// import { connect } from 'react-redux';
// import { Button, Form, Input, Divider, Alert } from 'antd';
// import { MailOutlined, LockOutlined } from '@ant-design/icons';
// import PropTypes from 'prop-types';
// import { GoogleSVG, FacebookSVG } from 'assets/svg/icon';
// import CustomIcon from 'components/util-components/CustomIcon'
// import { 
// 	signIn, 
// 	showLoading, 
// 	showAuthMessage, 
// 	hideAuthMessage, 
// 	signInWithGoogle, 
// 	signInWithFacebook 
// } from 'store/slices/authSlice';
// import { Link, useNavigate } from 'react-router-dom'
// import { motion } from "framer-motion"

// export const LoginForm = props => {

// 	const navigate = useNavigate();

// 	const { 
// 		otherSignIn, 
// 		showForgetPassword, 
// 		hideAuthMessage,
// 		onForgetPasswordClick,
// 		showLoading,
// 		signInWithGoogle,
// 		signInWithFacebook,
// 		extra, 
// 		signIn, 
// 		token, 
// 		loading,
// 		redirect,
// 		showMessage,
// 		message,
// 		allowRedirect = true
// 	} = props

// 	const initialCredential = {
// 		email: 'john@example.com',
// 		password: 'Naveen@123'
// 	}

// 	const onLogin = values => {
// 		showLoading()
// 		signIn(values);
// 	};

// 	const onGoogleLogin = () => {
// 		showLoading()
// 		signInWithGoogle()
// 	}

// 	const onFacebookLogin = () => {
// 		showLoading()
// 		signInWithFacebook()
// 	}

// 	useEffect(() => {
// 		if (token !== null && allowRedirect) {
// 			navigate(redirect)
// 		}
// 		if (showMessage) {
// 			const timer = setTimeout(() => hideAuthMessage(), 3000)
// 			return () => {
// 				clearTimeout(timer);
// 			};
// 		}
// 	}, []);

// 	const renderOtherSignIn = (
// 		<div>
// 			<Divider>
// 				<span className="text-muted font-size-base font-weight-normal">or connect with</span>
// 			</Divider>
// 			<div className="d-flex justify-content-center">
// 				<Button 
// 					onClick={() => onGoogleLogin()} 
// 					className="mr-2" 
// 					disabled={loading} 
// 					icon={<CustomIcon svg={GoogleSVG}/>}
// 				>
// 					Google
// 				</Button>
// 				<Button 
// 					onClick={() => onFacebookLogin()} 
// 					icon={<CustomIcon svg={FacebookSVG}/>}
// 					disabled={loading} 
// 				>
// 					Facebook
// 				</Button>
// 			</div>
// 		</div>
// 	)

// 	return (
// 		<>
// 			<motion.div 
// 				initial={{ opacity: 0, marginBottom: 0 }} 
// 				animate={{ 
// 					opacity: showMessage ? 1 : 0,
// 					marginBottom: showMessage ? 20 : 0 
// 				}}> 
// 				<Alert type="error" showIcon message={message}></Alert>
// 			</motion.div>
// 			<Form 
// 				layout="vertical" 
// 				name="login-form" 
// 				initialValues={initialCredential}
// 				onFinish={onLogin}
// 			>
// 				<Form.Item 
// 					name="email" 
// 					label="Email" 
// 					rules={[
// 						{ 
// 							required: true,
// 							message: 'Please input your email',
// 						},
// 						{ 
// 							type: 'email',
// 							message: 'Please enter a validate email!'
// 						}
// 					]}>
// 					<Input prefix={<MailOutlined className="text-primary" />}/>
// 				</Form.Item>
// 				<Form.Item 
// 					name="password" 
// 					label={
// 						<div className={`${showForgetPassword? 'd-flex justify-content-between w-100 align-items-center' : ''}`}>
// 							<span>Password</span>
// 							{
// 								showForgetPassword && 
// 								<span 
// 									onClick={() => onForgetPasswordClick} 
// 									className="cursor-pointer font-size-sm font-weight-normal text-muted"
// 								>
// 									Forget Password?
// 								</span>
// 							} 
// 						</div>
// 					} 
// 					rules={[
// 						{ 
// 							required: true,
// 							message: 'Please input your password',
// 						}
// 					]}
// 				>
// 					<Input.Password prefix={<LockOutlined className="text-primary" />}/>
// 					<div className='text-right mt-2'>
// 						 <Link to="/auth/forgot-password">Forgot Password?</Link>
// 					</div>
// 				</Form.Item>
// 				<Form.Item>

// 					<Button type="primary" htmlType="submit" block loading={loading}>
// 						Log In
// 					</Button>
// 				</Form.Item>
// 				{/* {
// 					otherSignIn ? renderOtherSignIn : null
// 				}
// 				{ extra } */}
// 			</Form>
// 		</>
// 	)
// }

// LoginForm.propTypes = {
// 	otherSignIn: PropTypes.bool,
// 	showForgetPassword: PropTypes.bool,
// 	extra: PropTypes.oneOfType([
// 		PropTypes.string,
// 		PropTypes.element
// 	]),
// };

// LoginForm.defaultProps = {
// 	otherSignIn: true,
// 	showForgetPassword: false
// };

// const mapStateToProps = ({auth}) => {
// 	const {loading, message, showMessage, token, redirect} = auth;
//   return {loading, message, showMessage, token, redirect}
// }

// const mapDispatchToProps = {
// 	signIn,
// 	showAuthMessage,
// 	showLoading,
// 	hideAuthMessage,
// 	signInWithGoogle,
// 	signInWithFacebook
// }

// export default connect(mapStateToProps, mapDispatchToProps)(LoginForm)


import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Button, Form, Input, Divider, Alert } from 'antd';
import { MailOutlined, LockOutlined, GoogleOutlined, FacebookOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import {
	signIn,
	showLoading,
	showAuthMessage,
	hideAuthMessage,
	signInWithGoogle,
	signInWithFacebook,
} from 'store/slices/authSlice';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const LoginForm = (props) => {
	const navigate = useNavigate();

	const {
		showForgetPassword,
		hideAuthMessage,
		showLoading,
		signInWithGoogle,
		signInWithFacebook,
		signIn,
		token,
		loading,
		redirect,
		showMessage,
		message,
		allowRedirect = true,
	} = props;

	const initialCredential = {
		email: '',
		password: '',
	};

	const onLogin = (values) => {
		console.log('✅ onLogin triggered with values:', values);
		showLoading();
		signIn(values);
	};

	const onGoogleLogin = () => {
		showLoading();
		signInWithGoogle();
	};

	const onFacebookLogin = () => {
		showLoading();
		signInWithFacebook();
	};

	useEffect(() => {
		if (token && allowRedirect) {
			navigate(redirect || '/');
		}
		if (showMessage) {
			const timer = setTimeout(() => hideAuthMessage(), 3000);
			return () => clearTimeout(timer);
		}
	}, [token, showMessage, hideAuthMessage, navigate, redirect, allowRedirect]);

	return (
		<>
			{/* Error Message */}
			<motion.div
				initial={{ opacity: 0, marginBottom: 0 }}
				animate={{
					opacity: showMessage ? 1 : 0,
					marginBottom: showMessage ? 20 : 0,
				}}
			>
				{showMessage && <Alert type="success" showIcon message={message} />}
			</motion.div>

			{/* Login Form */}
			<Form
				layout="vertical"
				name="login-form"
				initialValues={initialCredential}
				onFinish={onLogin}
				onFinishFailed={(errorInfo) => {
					console.log('❌ Validation Failed:', errorInfo);
				}}
			>
				{/* Email */}
				<Form.Item

					name="email"
					label="Email"
					rules={[
						{
							required: true,
							message: 'Please input your email',
						},
						{
							type: 'email',
							message: 'Please enter a valid email!',
						},
					]}
				>
					<Input
						// prefix={<MailOutlined className="text-primary" />}
						placeholder="Enter your email"
						size='large'
					/>
				</Form.Item>

				{/* Password */}
				<Form.Item
					name="password"
					label={
						<div
							className={`${showForgetPassword
								? 'd-flex justify-content-between w-100 align-items-center'
								: ''
								}`}
						>
							<span>Password</span>
						</div>
					}
					rules={[
						{
							required: true,
							message: 'Please input your password',
						},
					]}
				>
					<Input.Password
						// prefix={<LockOutlined className="text-primary" />}
						placeholder="Enter your password"
						size='large'
					/>

				</Form.Item>

				<div className='text-right mb-2'>
					<Link to="/auth/forgot-password">Forgot Password?</Link>
				</div>

				{/* Submit */}
				<Form.Item>
					<Button type="primary" htmlType="submit" block loading={loading}>
						Log In
					</Button>
				</Form.Item>

				{/* Divider and Social Login */}
				{/* <Divider>
          <span className="text-muted font-size-base font-weight-normal">
            or connect with
          </span>
        </Divider> */}

				{/* <div className="d-flex justify-content-center" style={{ gap: '10px' }}>
          <Button
            onClick={onGoogleLogin}
            disabled={loading}
            icon={<GoogleOutlined />}
          >
            Google
          </Button>
          <Button
            onClick={onFacebookLogin}
            disabled={loading}
            icon={<FacebookOutlined />}
          >
            Facebook
          </Button>
        </div> */}

				{/* <div className="text-center mt-3">
          <span>Don’t have an account? </span>
          <Link to="/auth/register">Register Now</Link>
        </div> */}
			</Form>
		</>
	);
};

LoginForm.propTypes = {
	showForgetPassword: PropTypes.bool,
	allowRedirect: PropTypes.bool,
};

LoginForm.defaultProps = {
	showForgetPassword: true,
	allowRedirect: true,
};

const mapStateToProps = ({ auth }) => {
	const { loading, message, showMessage, token, redirect } = auth;
	return { loading, message, showMessage, token, redirect };
};

const mapDispatchToProps = {
	signIn,
	showAuthMessage,
	showLoading,
	hideAuthMessage,
	signInWithGoogle,
	signInWithFacebook,
};

export default connect(mapStateToProps, mapDispatchToProps)(LoginForm);
