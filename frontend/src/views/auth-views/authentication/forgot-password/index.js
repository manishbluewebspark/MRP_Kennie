import React from 'react'
import LoginForm from '../../components/LoginForm'
import { Card, Row, Col } from "antd";
import { useSelector } from 'react-redux';
import ForgotPasswordForm from 'views/auth-views/components/ForgotPasswordForm';

const backgroundStyle = {
	backgroundImage: 'url(/img/others/img-17.jpg)',
	backgroundRepeat: 'no-repeat',
	backgroundSize: 'cover'
}

const LoginOne = props => {
	const theme = useSelector(state => state.theme.currentTheme)
	return (
		<div className="h-100" style={{ minHeight: "100vh" }}>
			<Row className="h-100">
				{/* Left side image */}
				<Col
									xs={0}
									md={12}
									className="d-none d-md-block"
									style={{
										padding: 0,
									}}
								>
									<div
										style={{
											width: "100%",
											height: "100vh", // ya parent height ke hisab se
											backgroundImage: "url('/img/AuthBanner.svg')",
											backgroundSize: "contain", // image poori dikhegi
											backgroundPosition: "center center",
											backgroundRepeat: "no-repeat",
											backgroundColor: "#414ff3", // ya koi light background
										}}
									></div>
								</Col>

				{/* Right side form */}
				<Col xs={24} md={12} className="d-flex align-items-center justify-content-center">
					<div style={{ width: "100%", maxWidth: "600px", padding: "20px" }}>
						{/* <Card> */}
						<div className="my-4">
							<div className="text-left mb-3">
								<img
									className="img-fluid"
									src={`/img/${theme === "light" ? "logo.png" : "logo-white.png"}`}
									alt="Logo"
									style={{ maxHeight: "60px" }}
								/>
							</div>
							<div className="text-left mb-3">
								<h1>Forgot Password?</h1>
								<p>Enter the code sent to your email.</p>
							</div>
							<Row justify="center">
								<Col xs={24}>
									<ForgotPasswordForm {...props} />
								</Col>
							</Row>
						</div>
						{/* </Card> */}
					</div>
				</Col>
			</Row>
		</div>

	)
}

export default LoginOne
