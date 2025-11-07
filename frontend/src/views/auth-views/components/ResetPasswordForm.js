import React from 'react'
import { Button, Form, Input, Alert } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { connect, useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import {
  showLoading,
  hideAuthMessage,
  showAuthMessage,
  resetPassword,
} from 'store/slices/authSlice'
import { useLocation, useNavigate } from 'react-router-dom'

const ResetPasswordForm = props => {
  const location = useLocation();
  const navigate = useNavigate()
  const email = location.state?.email;
  const { loading, message, showMessage, hideAuthMessage, showLoading } = props
  const dispatch = useDispatch()
  const onFinish = async (values) => {
    const { password, confirmPassword } = values;

    if (password !== confirmPassword) {
      showMessage('Passwords do not match!');
      return;
    }

    try {
 

      // Dispatch Redux thunk
      const response = await dispatch(
        resetPassword({ email, newPassword:password }) // email aap navigate se state me bhej rahe ho
      ).unwrap();

      // Agar API success hai
      if (response.success) {
        // message.success(response.message); // show success message
        navigate('/auth/login');           // redirect to login page
      }
    } catch (err) {
      console.error('Reset Password Error:', err);
      // message.error(err || 'Password reset failed!');
    } finally {
   
    }
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
        <Alert type="success" showIcon message={message}></Alert>
      </motion.div>

      <Form layout="vertical" name="reset-password-form" onFinish={onFinish}>
        <Form.Item
          name="password"
          label="New Password"
          rules={[
            { required: true, message: 'Please enter your new password' },
            { min: 6, message: 'Password must be at least 6 characters' },
          ]}
          hasFeedback
        >
          <Input.Password
            size='large'
            // prefix={<LockOutlined className="text-primary" />}
            placeholder="Enter new password"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
          dependencies={['password']}
          hasFeedback
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('Passwords do not match!'))
              },
            }),
          ]}
        >
          <Input.Password
            // prefix={<LockOutlined className="text-primary" />}
            size='large'
            placeholder="Confirm new password"
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Reset Password
          </Button>
        </Form.Item>
      </Form>
    </>
  )
}

ResetPasswordForm.propTypes = {
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

export default connect(mapStateToProps, mapDispatchToProps)(ResetPasswordForm)
