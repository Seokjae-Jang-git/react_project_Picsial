import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom'; 
import { jwtDecode } from 'jwt-decode';
import Header from './Header';
import MyPageSide from './MyPageSide';
import MyPageDash from './MyPageDash';
import './css/MyPage.css';

import Hashids from 'hashids';
const hashids = new Hashids(process.env.REACT_APP_HASHIDS_SECRET, 8);

const MyPage = () => {
    const navigate = useNavigate();
    const { hashedId } = useParams(); 
    const [userNo, setUserNo] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const triggerProfileRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        
        if (!token) {
            alert('로그인이 필요한 service입니다.');
            navigate('/login');
            return;
        }

        try {
            const decodedToken = jwtDecode(token);
            const loggedInUserNo = decodedToken.userNo;

            const decodedArray = hashids.decode(hashedId);
            const targetUserNo = decodedArray[0];

            if (loggedInUserNo !== targetUserNo) {
                alert('잘못된 접근입니다. 본인의 마이페이지가 아닙니다.');
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
                <div className="mypage-side-box">
                    <MyPageSide myUserNo={userNo} hashedId={hashedId} refreshTrigger={refreshTrigger} />
                </div>
                
                <main className="mypage-content-area">
                    <Outlet context={{ 
                        myUserNo: userNo, 
                        hashedId: hashedId, 
                        refreshProfile: triggerProfileRefresh 
                    }} />
                </main>
            </div>
        </div>
    );
};

export default MyPage;