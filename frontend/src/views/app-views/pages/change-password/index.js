import React from 'react';
import { Form, Input, Button, message } from 'antd';
import { useDispatch } from 'react-redux';
import { updatePassword } from 'store/slices/authSlice';


const ChangePassword = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
  const key = 'updatable';
  message.loading({ content: 'Updating password...', key });

  try {
    await dispatch(updatePassword(values)).unwrap(); // calls thunk
    message.success({ content: 'Password updated successfully!', key, duration: 2 });
    form.resetFields();
  } catch (err) {
    console.error(err);
    message.error({ content: err || 'Failed to update password!', key, duration: 2 });
  }
};


  return (
    <div className="mt-4">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item
          label="Old Password"
          name="oldPassword"
          rules={[{ required: true, message: 'Please enter your old password!' }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          label="New Password"
          name="newPassword"
          rules={[
            { required: true, message: 'Please enter a new password!' },
            { min: 6, message: 'Password must be at least 6 characters long!' }
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          label="Confirm New Password"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Please confirm your new password!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match!'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Button type="primary" htmlType="submit">
          Change Password
        </Button>
      </Form>
    </div>
  );
};

export default ChangePassword;
