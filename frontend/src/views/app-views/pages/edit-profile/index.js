import React, { useState, useEffect } from 'react';
import { Form, Avatar, Button, Input, DatePicker, Row, Col, message, Upload } from 'antd';
import { UserOutlined, UploadOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import { ROW_GUTTER } from 'constants/ThemeConstant';
import Flex from 'components/shared-components/Flex';
import { fetchCurrentUser, editProfile } from 'store/slices/authSlice';

const EditProfile = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector(state => state.auth);
  const [form] = Form.useForm();
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('/img/avatars/thumb-6.jpg');

  // Initialize form values and avatar
  useEffect(() => {
    if (!user) {
      dispatch(fetchCurrentUser());
    } else {
      form.setFieldsValue({
        name: user.name,
        userName: user.userName,
        email: user.email,
        dateOfBirth: user.dateOfBirth ? moment(user.dateOfBirth) : null,
        phoneNumber: user.phone,
        website: user.website,
        address: user.address,
        city: user.city,
        postcode: user.postcode
      });
      setAvatarPreview(user.avatar ? `${process.env.REACT_APP_API_URL}${user.avatar}` : '/img/avatars/thumb-6.jpg');
    }
  }, [user, dispatch, form]);

  // Avatar Upload Handler
  const onUploadAvatar = ({ file, onSuccess }) => {
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = e => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
    onSuccess("ok"); // AntD UI success
  };

  const onRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('/img/avatars/thumb-6.jpg');
  };

  // Form Submit Handler
  const onFinish = async values => {
    const key = 'updatable';
    message.loading({ content: 'Updating profile...', key });

    try {
      const formData = new FormData();

      Object.entries(values).forEach(([k, v]) => {
        if (v instanceof moment) {
          formData.append(k, v.toISOString());
        } else {
          formData.append(k, v || '');
        }
      });

      if (avatarFile) formData.append('avatar', avatarFile);

      await dispatch(editProfile(formData)).unwrap();

      message.success({ content: 'Profile Updated!', key, duration: 2 });
      dispatch(fetchCurrentUser()); // refresh redux state
    } catch (err) {
      message.error({ content: 'Update Failed!', key, duration: 2 });
      console.error(err);
    }
  };

  if (loading || !user) return <div>Loading...</div>;

  return (
    <>
      <Flex alignItems="center" mobileFlex={false} className="text-center text-md-left">
        <Avatar size={90} src={avatarPreview} icon={<UserOutlined />} />
        <div className="ml-3 mt-md-0 mt-3">
          <Upload
            showUploadList={false}
            customRequest={onUploadAvatar}
          >
            <Button icon={<UploadOutlined />} type="primary">Change Avatar</Button>
          </Upload>
          <Button className="ml-2" onClick={onRemoveAvatar}>Remove</Button>
        </div>
      </Flex>

      <div className="mt-4">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Row gutter={ROW_GUTTER}>
            <Col xs={24} sm={24} md={12}>
              <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Please input your name!' }]}>
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} sm={24} md={12}>
              <Form.Item label="userName" name="userName" rules={[{ required: true, message: 'Please input your username!' }]}>
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} sm={24} md={12}>
              <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}>
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} sm={24} md={12}>
              <Form.Item label="Date of Birth" name="dateOfBirth">
                <DatePicker className="w-100" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={24} md={12}>
              <Form.Item label="Phone Number" name="phoneNumber">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} sm={24} md={12}>
              <Form.Item label="Website" name="website">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} sm={24} md={24}>
              <Form.Item label="Address" name="address">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} sm={24} md={12}>
              <Form.Item label="City" name="city">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} sm={24} md={12}>
              <Form.Item label="Postcode" name="postcode">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Button type="primary" htmlType="submit">
            Save Changes
          </Button>
        </Form>
      </div>
    </>
  );
};

export default EditProfile;
