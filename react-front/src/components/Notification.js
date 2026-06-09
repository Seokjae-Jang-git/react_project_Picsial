import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header'; 
import './css/Notification.css';

import Hashids from 'hashids';
const hashids = new Hashids(process.env.REACT_APP_HASHIDS_SECRET, 8);

function Notification() {
    const navigate = useNavigate();
    const [myUserNo, setMyUserNo] = useState(null);
    const [notifications, setNotifications] = useState([]);
    
    const [filterType, setFilterType] = useState('all');
    const [sortOrder, setSortOrder] = useState('latest');

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setMyUserNo(decoded.userNo);
            } catch (error) {
                console.error("토큰 에러:", error);
            }
        }
    }, []);

    const fetchNotifications = async () => {
        if (!myUserNo) return;
        try {
            const response = await fetch(`http://localhost:3010/notification/list?userNo=${myUserNo}&filter=${filterType}&sort=${sortOrder}`);
            const data = await response.json();
            if (data.success) {
                setNotifications(data.list);
            }
        } catch (error) {
            console.error("알림 조회 에러:", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [myUserNo, filterType, sortOrder]);

    const handleMarkAllAsRead = async () => {
        if (!myUserNo) return;
        try {
            const response = await fetch('http://localhost:3010/notification/read-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userNo: myUserNo })
            });
            const data = await response.json();
            if (data.success) {
                setNotifications(prev => prev.map(noti => ({ ...noti, IS_READ: 'Y' })));
                window.dispatchEvent(new Event('updateBadge'));
            }
        } catch (error) {
            console.error("모두 읽음 처리 에러:", error);
        }
    };

    const handleNotificationClick = async (noti) => {
        if (noti.IS_READ === 'N') {
            try {
                await fetch(`http://localhost:3010/notification/${noti.NOTI_ID}/read`, {
                    method: 'PUT'
                });
                
                setNotifications(prevNotis => 
                    prevNotis.map(n => 
                        n.NOTI_ID === noti.NOTI_ID ? { ...n, IS_READ: 'Y' } : n
                    )
                );
                window.dispatchEvent(new Event('updateBadge'));
            } catch (error) {
                console.error("알림 읽음 처리 실패:", error);
            }
        }

        if (noti.TYPE_CODE === 'LIKE' || noti.TYPE_CODE === 'COMMENT' || noti.TYPE_CODE === 'SCRAP') {
            if (noti.PHOTO_ID) {
                navigate(`/photo/${noti.PHOTO_ID}`); 
            } else if (noti.POST_ID) {
                navigate(`/post/${noti.POST_ID}`);   
            }
        } else if (noti.TYPE_CODE === 'FOLLOW') {
            const hashedId = hashids.encode(noti.SENDER_NO);
            navigate(`/photog/${hashedId}`);
        } else if (noti.TYPE_CODE === 'MESSAGE') {
            navigate('/message', {
                state: { targetPartner: { USER_NO: noti.SENDER_NO, NICKNAME: noti.SENDER_NICKNAME } }
            });
        }
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        const postDate = new Date(dateString);
        const now = new Date();
        const diffMs = now - postDate;
        
        // 밀리초를 분, 시간, 일 단위로 변환
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);
        
        // 조건별로 세밀하게 시간 텍스트 반환
        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHrs < 24) return `${diffHrs}시간 전`;
        if (diffDays < 7) return `${diffDays}일 전`;
        
        return postDate.toLocaleDateString('ko-KR');
    };

    return (
        <div className="main-page-container">
            <Header />

            <main className="noti-body">
                <div className="noti-page-wrapper">
                    <div className="noti-container">
                        
                        <div className="noti-header-title">
                            <h2>알림</h2>
                        </div>

                        <div className="noti-controls">
                            <div className="noti-filters">
                                <select 
                                    className="noti-select" 
                                    value={filterType} 
                                    onChange={(e) => setFilterType(e.target.value)}
                                >
                                    <option value="all">전체(타입)</option>
                                    <option value="like">좋아요</option>
                                    <option value="comment">댓글</option>
                                    <option value="follow">팔로우</option>
                                    <option value="message">메세지</option>
                                    <option value="scrap">스크랩</option> 
                                </select>

                                <select 
                                    className="noti-select" 
                                    value={sortOrder} 
                                    onChange={(e) => setSortOrder(e.target.value)}
                                >
                                    <option value="latest">최신순</option>
                                    <option value="oldest">오래된순</option>
                                </select>
                            </div>

                            <button className="btn-read-all" onClick={handleMarkAllAsRead}>
                                모두 읽음
                            </button>
                        </div>

                        <div className="noti-list-section">
                            {notifications.length === 0 ? (
                                <div className="noti-empty">새로운 알림이 없습니다.</div>
                            ) : (
                                notifications.map(noti => (
                                    <div 
                                        key={noti.NOTI_ID} 
                                        className={`noti-item ${noti.IS_READ === 'N' ? 'unread' : ''}`}
                                        onClick={() => handleNotificationClick(noti)} 
                                        style={{ cursor: 'pointer' }}       
                                    >
                                        <div className="noti-content-area">
                                            {noti.IS_READ === 'N' && <div className="noti-unread-dot"></div>}
                                            <span className="noti-text">{noti.MESSAGE_TEXT}</span>
                                        </div>
                                        <div className="noti-time">
                                            {formatTimeAgo(noti.CREATED_AT)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}

export default Notification;