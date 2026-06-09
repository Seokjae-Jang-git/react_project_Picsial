import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Hashids from 'hashids';
import './css/MyFollowing.css';

function MyFollowing() {
    const navigate = useNavigate();
    const { myUserNo } = useOutletContext();
    const [followingList, setFollowingList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState('updated');

    const hashids = new Hashids(process.env.REACT_APP_HASHIDS_SECRET, 8);

    const fetchMyFollowing = async () => {
        if (!myUserNo) return;
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:3010/follow/following?userNo=${myUserNo}&sort=${sortOrder}`);
            const data = await response.json();
            if (data.success) {
                setFollowingList(data.list);
            }
        } catch (error) {
            console.error("팔로잉 목록 조회 에러:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMyFollowing();
    }, [myUserNo, sortOrder]);

    const handleFollowToggle = async (targetUserNo, currentStatus) => {
        const token = localStorage.getItem('jwtToken');
        if (!token) return alert("로그인이 필요합니다.");

        try {
            const decoded = jwtDecode(token);
            
            setFollowingList(prev => prev.map(photog => {
                if (photog.USER_NO === targetUserNo) {
                    const isCurrentlyFollowing = currentStatus === 'Y';
                    return { 
                        ...photog, 
                        IS_FOLLOWING: isCurrentlyFollowing ? 'N' : 'Y',
                        FOLLOWER_COUNT: isCurrentlyFollowing 
                            ? Math.max(0, photog.FOLLOWER_COUNT - 1) 
                            : photog.FOLLOWER_COUNT + 1
                    };
                }
                return photog;
            }));

            const response = await fetch('http://localhost:3010/follow/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    followerNo: decoded.userNo,
                    followingNo: targetUserNo
                })
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error("서버 업데이트 실패");
            }
        } catch (error) {
            console.error("팔로우 토글 에러:", error);
            alert("처리 중 오류가 발생했습니다.");
            setFollowingList(prev => prev.map(photog => {
                if (photog.USER_NO === targetUserNo) {
                    const isCurrentlyFollowing = currentStatus === 'Y';
                    return { 
                        ...photog, 
                        IS_FOLLOWING: currentStatus,
                        FOLLOWER_COUNT: isCurrentlyFollowing
                            ? photog.FOLLOWER_COUNT + 1
                            : Math.max(0, photog.FOLLOWER_COUNT - 1)
                    };
                }
                return photog;
            }));
        }
    };

    return (
        <div className="my-following-container">
            
            <div className="my-following-filter-group">
                <select 
                    className="my-following-sort-select"
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value)}
                >
                    <option value="updated">최근 업데이트순</option>
                    <option value="followers">팔로워순</option>
                    <option value="following">팔로잉순</option>
                    <option value="likes">좋아요순</option>
                    <option value="scraps">스크랩순</option>
                    <option value="following_latest">팔로잉 최신순</option>
                    <option value="following_oldest">팔로잉 오래된순</option>
                </select>
            </div>

            <div className="my-following-card-list">
                {followingList.length === 0 ? (
                    <div className="my-following-empty">팔로잉하는 작가가 없습니다.</div>
                ) : (
                    followingList.map(photog => (
                        <div key={photog.USER_NO} className="my-following-card">
                            
                            <div className="my-following-info-section">
                                <div className="my-following-profile-top"
                                    onClick={() => {
                                        const hashedId = hashids.encode(photog.USER_NO);
                                        navigate(`/photog/${hashedId}`);
                                    }}>
                                    {photog.PROFILE_IMAGE_URL ? (
                                        <img 
                                            src={photog.PROFILE_IMAGE_URL} 
                                            alt="프로필 이미지" 
                                            className="my-following-avatar"
                                        />
                                    ) : (
                                        <svg className="my-following-avatar-default" viewBox="0 0 24 24" fill="#ccc" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
                                        </svg>
                                    )}
                                    <div className="my-following-name-box">
                                        <h3 className="my-following-nickname">{photog.NICKNAME}</h3>
                                        <p className="my-following-intro">{photog.INTRO || '소개글이 없습니다.'}</p>
                                    </div>
                                </div>

                                <div className="my-following-stats">
                                    <div className="my-following-stat-row">
                                        <div className="my-following-stat-group">
                                            <span>팔로워</span> <strong>{photog.FOLLOWER_COUNT || 0}</strong>
                                        </div>
                                        <span className="my-following-stat-divider">/</span>
                                        <div className="my-following-stat-group">
                                            <span>팔로잉</span> <strong>{photog.FOLLOWING_COUNT || 0}</strong>
                                        </div>
                                    </div>

                                    <div className="my-following-stat-row">
                                        <div className="my-following-stat-group">
                                            <span>좋아요</span> <strong>{photog.TOTAL_LIKES || 0}</strong>
                                        </div>
                                        <span className="my-following-stat-divider">/</span>
                                        <div className="my-following-stat-group">
                                            <span>스크랩</span> <strong>{photog.TOTAL_SCRAPS || 0}</strong>
                                        </div>
                                    </div>

                                    <div className="my-following-stat-row my-following-update-time">
                                        <span>업데이트</span>
                                        <span>{photog.LAST_UPDATE ? photog.LAST_UPDATE : '기록 없음'}</span>
                                    </div>
                                </div>

                                <div className="my-following-actions">
                                    <button 
                                        className={`my-following-btn-follow ${photog.IS_FOLLOWING === 'Y' ? '' : 'my-following-not-following'}`}
                                        onClick={() => handleFollowToggle(photog.USER_NO, photog.IS_FOLLOWING)}
                                    >
                                        {photog.IS_FOLLOWING === 'Y' ? '팔로우 취소' : '팔로우'}
                                    </button>
                                    <button 
                                        className="my-following-btn-message" 
                                        onClick={() => {
                                            navigate('/message', { 
                                                state: { targetPartner: photog } 
                                            });
                                        }}
                                    >
                                        메시지
                                    </button>
                                </div>
                            </div>
                            
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default MyFollowing;