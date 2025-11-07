import React from 'react'
import { Button, Form, Input, Alert } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { connect, useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import {
  showLoading,
  hideAuthMessage,
  showAuthMessage,
  forgotPassword,
} from 'store/slices/authSlice'
import { useNavigate } from 'react-router-dom'
import AuthService from 'services/AuthService'

export const ForgotPasswordForm = props => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const {
    loading,
    message,
    showMessage,
    hideAuthMessage,
    showLoading,
  } = props

 const onFinish = async (values) => {
  dispatch(forgotPassword({ email: values.email }))
    .unwrap()
    .then((res) => {
      navigate('/auth/verify-code', { state: { email: values.email } });
    })
    .catch((err) => {
      // message.error(err || "Something went wrong");
    });
};




  return (
    <>
      <motion.div
        initial={{ opacity: 0, marginBottom: 0 }}
        animate={{
          opacity: showMessage ? 1 : 0,
          marginBottom: showMessage ? 20 : 0,
        }}
      >
        {/* <Alert type="error" showIcon message={message}></Alert> */}
      </motion.div>

      <Form layout="vertical" name="forgot-password-form" onFinish={onFinish}>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Please input your email' },
            { type: 'email', message: 'Please enter a valid email!' },
          ]}
        >
          <Input
            // prefix={<MailOutlined className="text-primary" />}
            placeholder="Enter your registered email"
            size='large'
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Get Code
          </Button>
        </Form.Item>
      </Form>
    </>
  )
}

ForgotPasswordForm.propTypes = {
  loading: PropTypes.bool,
  message: PropTypes.string,
  showMessage: PropTypes.bool,
}

const mapStateToProps = ({ auth }) => {
  const { loading, message, showMessage } = auth
  return { loading, message, showMessage }
}

const mapDispatchToProps = {
  showLoading,
  hideAuthMessage,
  showAuthMessage,
}

export default connect(mapStateToProps, mapDispatchToProps)(ForgotPasswordForm)
