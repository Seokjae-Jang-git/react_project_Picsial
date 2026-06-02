import React, { useRef } from 'react';
import './css/Login.css';
import { useNavigate } from 'react-router-dom';


function Login() {
    // 입력 필드를 useRef로 제어
    const userIdRef = useRef(null);
    const passwordRef = useRef(null);

    const navigate = useNavigate();

    // 로그인 제출 핸들러
    async function handleSubmit(e) {
        e.preventDefault();

        const userId = userIdRef.current.value.trim();
        const password = passwordRef.current.value;

        if (!userId || !password) {
            alert('아이디와 비밀번호를 모두 입력해 주세요.');
            return;
        }

        try {
            // 백엔드 로그인 엔드포인트(/auth/login)로 요청
            const response = await fetch('http://localhost:3010/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '로그인에 실패했습니다.');
            }

            if (data.success) {
                alert(data.message);
                
                localStorage.setItem('jwtToken', data.token);

                navigate('/');
            }

        } catch (error) {
            console.error('로그인 요청 에러:', error);
            alert(error.message);
        }
    }

    return (
        <div className="login-container">
            <h2>Picsial 로그인</h2>
            <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                    <label>아이디</label>
                    <input type="text" ref={userIdRef} placeholder="아이디를 입력하세요" required />
                </div>

                <div className="form-group">
                    <label>비밀번호</label>
                    <input type="password" ref={passwordRef} placeholder="비밀번호를 입력하세요" required />
                </div>

                <button type="submit" className="login-submit-btn">로그인</button>
            </form>
            <div className="auth-actions">
                <span className="auth-notice">계정이 없으신가요?</span>
                <button onClick={() => navigate('/signup')} className="link-btn">
                    회원가입
                </button>
                <br /><br />
                <button onClick={() => navigate('/')} className="back-btn">
                    메인으로 돌아가기
                </button>
            </div>
        </div>
    );
}

export default Login;