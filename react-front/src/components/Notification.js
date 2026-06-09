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

    const timeAgo = (dateString) => {
        if (!dateString) return '';
        const now = new Date();
        const past = new Date(dateString);
        const seconds = Math.floor((now - past) / 1000);
        
        if (seconds < 60) return '방금 전';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}분 전`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}시간 전`;
        const days = Math.floor(hours / 24);
        return `${days}일 전`;
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
                                            {timeAgo(noti.CREATED_AT)}
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