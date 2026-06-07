import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom'; // 💡 useParams 추가
import { jwtDecode } from 'jwt-decode';
import Header from './Header';
import MyPageSide from './MyPageSide';
import MyPageDash from './MyPageDash';
import './css/MyPage.css';

import Hashids from 'hashids';
const hashids = new Hashids(process.env.REACT_APP_HASHIDS_SECRET, 8);

const MyPage = () => {
    const navigate = useNavigate();
    const { hashedId } = useParams(); // 1. URL에서 암호화된 ID 추출 (/mypage/:hashedId)
    const [userNo, setUserNo] = useState(null);

    // 💡 1. 새로고침 신호를 주기 위한 상태 (0, 1, 2... 형태로 증가)
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // 💡 2. 자식(MyAccount)이 호출할 새로고침 실행 함수
    const triggerProfileRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        
        if (!token) {
            alert('로그인이 필요한 서비스입니다.');
            navigate('/login');
            return;
        }

        try {
            // 2. 토큰에서 로그인한 사람의 유저 번호 추출
            const decodedToken = jwtDecode(token);
            const loggedInUserNo = decodedToken.userNo;

            // 3. URL의 hashedId를 숫자로 복호화
            const decodedArray = hashids.decode(hashedId);
            const targetUserNo = decodedArray[0];

            // 4. [보안/검증] 다른 사람이 내 마이페이지 URL로 장난치거나 접근하는 것을 방지
            if (loggedInUserNo !== targetUserNo) {
                alert('잘못된 접근입니다. 본인의 마이페이지가 아닙니다.');
                // 본인의 올바른 마이페이지로 강제 리다이렉트
                const myHashedId = hashids.encode(loggedInUserNo);
                navigate(`/mypage/${myHashedId}`);
                return;
            }

            setUserNo(targetUserNo); 
        } catch (error) {
            console.error('마이페이지 인증 및 복호화 실패:', error);
            alert('올바르지 않은 접근입니다.');
            navigate('/');
        }
    }, [hashedId, navigate]);

    if (!userNo) return null; 

    return (
        <div className="mypage-root">
            <Header />
            <div className="mypage-wrapper">
                {/* 💡 찌그러짐을 방지하기 위해 사이드바를 고정 가로 폭 박스로 감싸줍니다. */}
                <div className="mypage-side-box">
                    <MyPageSide myUserNo={userNo} hashedId={hashedId} refreshTrigger={refreshTrigger} />
                </div>
                
                <main className="mypage-content-area">
                    {/* 하위 탭 컴포넌트(대시보드 등)에서 사용할 수 있도록 context 주입 */}
                    <Outlet context={{ 
                        myUserNo: userNo, 
                        hashedId: hashedId, 
                        refreshProfile: triggerProfileRefresh // 추가된 부분
                    }} />
                </main>
            </div>
        </div>
    );
};

export default MyPage;