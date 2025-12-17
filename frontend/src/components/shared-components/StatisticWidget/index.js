import React from 'react'
import Card from 'components/shared-components/Card';
import PropTypes from "prop-types";
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const StatisticWidget = ({ title, value, status, subtitle, prefix }) => {
	return (
		<Card>
			{title && <h4 className="mb-0">{title}</h4>}
			<div className={`d-flex justify-content-between align-items-center ${title ? 'mt-3' : ''}`}>

				{/* Left content */}
				<div>
					<div className="d-flex align-items-center">
						<h1 className="mb-0 font-weight-bold">{value}</h1>

						{status !== undefined && status !== null && status !== 0 && (
							<span
								className={`font-size-md font-weight-bold ml-3 ${status > 0 ? 'text-success' : 'text-danger'
									}`}
							>
								{Math.abs(status)}
								{status > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
							</span>
						)}
					</div>

					{subtitle && (
						<div className="text-gray-light mt-1">
							{subtitle}
						</div>
					)}
				</div>

				{/* Right icon (center aligned) */}
				{prefix && (
					<div className="d-flex align-items-center">
						{prefix}
					</div>
				)}

			</div>

		</Card>
	)
}

StatisticWidget.propTypes = {
	title: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.element
	]),
	value: PropTypes.string,
	subtitle: PropTypes.string,
	status: PropTypes.number,
	prefix: PropTypes.element
};

export default StatisticWidget