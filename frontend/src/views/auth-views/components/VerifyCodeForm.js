import React, { useEffect, useState } from 'react'
import { Button, Form, Input, Alert, Row, Col } from 'antd'
import { motion } from 'framer-motion'
import { connect, useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import {
  showLoading,
  hideAuthMessage,
  showAuthMessage,
  verifyOtp,
  resendOtp,
} from 'store/slices/authSlice'
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom'
import AuthService from 'services/AuthService'
import ButtonComponent from 'views/app-views/components/general/button'

const VerifyCodeForm = props => {
  const location = useLocation();
  const email = location.state?.email;
  const navigate = useNavigate()
  const dispatch = useDispatch()
   const [timer, setTimer] = useState(120); // 2 minutes = 120 sec
  const [canResend, setCanResend] = useState(false);

  const { loading, message, showMessage, hideAuthMessage, showLoading } = props
  const [otp, setOtp] = useState(['', '', '', ''])


  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else {
      setCanResend(true); // enable resend button
    }
    return () => clearInterval(interval);
  }, [timer]);

   const handleResend = async () => {
    try {
      setCanResend(false);
      setTimer(120); // restart timer
      const response = await dispatch(resendOtp({ email })).unwrap();
      message.success(response.message || "OTP resent successfully");
    } catch (err) {
      message.error(err || "Failed to resend OTP");
      setCanResend(true);
    }
  };


  const handleChange = (e, index) => {
    const { value } = e.target
    if (/^[0-9]?$/.test(value)) {
      const newOtp = [...otp]
      newOtp[index] = value
      setOtp(newOtp)
      // auto focus next
      if (value && index < 3) {
        const nextInput = document.getElementById(`otp-${index + 1}`)
        if (nextInput) nextInput.focus()
      }
    }
  }

// const onFinish = async () => {
//   const code = otp.join('');
//   if (code.length < 4) {
//     showMessage('Please enter full 4 digit code');
//     return;
//   }

//   try {
//     const response = await dispatch(verifyOtp({ email, otp: code })).unwrap();

//     if (response.success) {
//       // message.success(response.message);
//       navigate('/auth/reset-password', { state: { email } });
//     }
//   } catch (err) {
//     // message.error(err || 'OTP verification failed!');
//   }
// };

 const onFinish = async (values) => {
  const code = otp.join('');
  if (code.length < 4) {
    showMessage('Please enter full 4 digit code');
    return;
  }
  dispatch(verifyOtp({ email, otp: code }))
    .unwrap()
    .then((res) => {
      navigate('/auth/reset-password', { state: { email: email } });
    })
    .catch((err) => {
      message.error(err || "Something went wrong");
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

      <Form layout="vertical" name="verify-code-form" onFinish={onFinish}>
        <Form.Item>
          <Row gutter={12} justify="left">
            {otp.map((digit, i) => (
              <Col key={i}>
                <Input
                  id={`otp-${i}`}
                  value={digit}
                  onChange={e => handleChange(e, i)}
                  maxLength={1}
                  style={{
                    width: 50,
                    height: 50,
                    textAlign: 'center',
                    fontSize: 24,
                  }}
                />
              </Col>
            ))}
          </Row>
         <div className="mt-2 text-left">
      {canResend ? (
        <Button type="link" onClick={handleResend}>
          Resend Code
        </Button>
      ) : (
        <span>Resend available in {timer}s</span>
      )}
    </div>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            disabled={otp.join('').length < 4}
          >
            Verify Code
          </Button>
        </Form.Item>
      </Form>
    </>
  )
}

VerifyCodeForm.propTypes = {
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

export default connect(mapStateToProps, mapDispatchToProps)(VerifyCodeForm)
