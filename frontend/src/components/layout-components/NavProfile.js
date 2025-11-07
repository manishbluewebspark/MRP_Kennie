import React from 'react';
import { Dropdown, Avatar } from 'antd';
import { useDispatch, useSelector } from 'react-redux'
import {
	EditOutlined,
	SettingOutlined,
	ShopOutlined,
	QuestionCircleOutlined,
	LogoutOutlined,
	LockOutlined
} from '@ant-design/icons';
import NavItem from './NavItem';
import Flex from 'components/shared-components/Flex';
import { signOut } from 'store/slices/authSlice';
import styled from '@emotion/styled';
import { FONT_WEIGHT, MEDIA_QUERIES, SPACER, FONT_SIZES } from 'constants/ThemeConstant'

const Icon = styled.div(() => ({
	fontSize: FONT_SIZES.LG
}))

const Profile = styled.div(() => ({
	display: 'flex',
	alignItems: 'center'
}))

const UserInfo = styled('div')`
	padding-left: ${SPACER[2]};

	@media ${MEDIA_QUERIES.MOBILE} {
		display: none
	}
`

const Name = styled.div(() => ({
	fontWeight: FONT_WEIGHT.SEMIBOLD
}))

const Title = styled.span(() => ({
	opacity: 0.8
}))

const MenuItem = (props) => (
	<Flex as="a" href={props.path} alignItems="center" gap={SPACER[2]}>
		<Icon>{props.icon}</Icon>
		<span>{props.label}</span>
	</Flex>
)

const MenuItemSignOut = (props) => {

	const dispatch = useDispatch();

	const handleSignOut = () => {
		dispatch(signOut())
	}

	return (
		<div onClick={handleSignOut}>
			<Flex alignItems="center" gap={SPACER[2]} >
				<Icon>
					<LogoutOutlined />
				</Icon>
				<span>{props.label}</span>
			</Flex>
		</div>
	)
}

const items = [
	{
		key: 'Edit Profile',
		label: <MenuItem path="/app/pages/edit-profile" label="Edit Profile" icon={<EditOutlined />} />,
	},
	{
		key: 'Change Password',
		label: <MenuItem path="/app/pages/change-password" label="Change Password" icon={<LockOutlined />} />,
	},
	// {
	// 	key: 'Account Billing',
	// 	label: <MenuItem path="/" label="Account Billing" icon={<ShopOutlined />} />,
	// },
	{
		key: 'Sample Excels',
		label: <MenuItem path="/app/pages/sample-files" label="Help Center" icon={<QuestionCircleOutlined />} />,
	},
	{
		key: 'Sign Out',
		label: <MenuItemSignOut label="Sign Out" />,
	}
]

export const NavProfile = ({ mode }) => {
	const user = useSelector(state => state.auth.user); // auth slice ka user
	console.log('Logged in user:', user);

	return (
		<Dropdown placement="bottomRight" menu={{ items }} trigger={["click"]}>
			<NavItem mode={mode}>
				<Profile>
					<Avatar src={user.avatar ? `${process.env.REACT_APP_API_URL}${user.avatar}` : '/img/avatars/thumb-6.jpg'} />
					<UserInfo className="profile-text">
						<Name>{user?.name || "Jhon Doe"}</Name>
						<Title>{user?.role?.name || "Admin"}</Title>
					</UserInfo>
				</Profile>
			</NavItem>
		</Dropdown>
	);
}

export default NavProfile
