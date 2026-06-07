import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 🚀 1. 네비게이트 임포트
import { jwtDecode } from 'jwt-decode';
import Hashids from 'hashids';
import './css/FollowGrid.css';

function FollowGrid({ sortOption, onFollowChange }) {
    const [photogs, setPhotogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate(); // 🚀 2. 초기화
    const hashids = new Hashids(process.env.REACT_APP_HASHIDS_SECRET, 8);

    const sortLabel = {
        'followers': '팔로워 순',
        'updated': '최근 업데이트 순',
        'likes': '좋아요 순',
        'scraps': '스크랩 순'
    };

    // 💡 1. 작가 목록 및 데이터 불러오기
    useEffect(() => {
        const fetchphotogs = async () => {
            setIsLoading(true);
            const token = localStorage.getItem('jwtToken');
            if (!token) return;

            try {
                const decoded = jwtDecode(token);
                const response = await fetch(`http://localhost:3010/follow/photogs?sort=${sortOption}&userNo=${decoded.userNo}`);
                const data = await response.json();
                
                if (data.success) {
                    setPhotogs(data.photogs);
                }
            } catch (error) {
                console.error("작가 목록 로드 실패:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchphotogs();
    }, [sortOption]);

    // 💡 2. 팔로우 / 팔로우 취소 토글 로직
    const handleFollowToggle = async (targetUserNo, currentStatus) => {
        const token = localStorage.getItem('jwtToken');
        if (!token) return alert("로그인이 필요합니다.");

        try {
            const decoded = jwtDecode(token);
            
            // 🚀 1. 프론트엔드 UI 즉각 업데이트: 버튼 색상 변경 + 팔로워 숫자 증감!
            setPhotogs(prev => prev.map(photog => {
                if (photog.USER_NO === targetUserNo) {
                    const isCurrentlyFollowing = currentStatus === 'Y';
                    return { 
                        ...photog, 
                        // 상태 뒤집기
                        IS_FOLLOWING: isCurrentlyFollowing ? 'N' : 'Y',
                        // 팔로우 취소면 -1, 새로 팔로우면 +1
                        FOLLOWER_COUNT: isCurrentlyFollowing 
                            ? Math.max(0, photog.FOLLOWER_COUNT - 1) 
                            : photog.FOLLOWER_COUNT + 1
                    };
                }
                return photog;
            }));

            // 백엔드에 토글 요청
            const response = await fetch('http://localhost:3010/follow/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    followerNo: decoded.userNo,
                    followingNo: targetUserNo
                })
            });
            const data = await response.json();

            if (data.success) {
                // DB 업데이트 성공 시 사이드바에 신호탄 쏘기
                if (onFollowChange) onFollowChange();
            } else {
                // 🚀 2. 실패 시 롤백 로직: 원래 상태와 숫자로 원상복구
                alert("처리 중 오류가 발생했습니다.");
                setPhotogs(prev => prev.map(photog => {
                    if (photog.USER_NO === targetUserNo) {
                        const isCurrentlyFollowing = currentStatus === 'Y';
                        return { 
                            ...photog, 
                            IS_FOLLOWING: currentStatus,
                            // 올렸던 건 다시 내리고, 내렸던 건 다시 올림
                            FOLLOWER_COUNT: isCurrentlyFollowing
                                ? photog.FOLLOWER_COUNT + 1
                                : Math.max(0, photog.FOLLOWER_COUNT - 1)
                        };
                    }
                    return photog;
                }));
            }
        } catch (error) {
            console.error("팔로우 토글 에러:", error);
        }
    };

    // if (isLoading) return <div className="follow-grid-loading">작가 데이터를 불러오는 중입니다...</div>;

    return (
        <div className="follow-grid-container">
            {/* 🚀 4. 요청하신 상단 '추천 작가 목록' 헤더 삭제 완료 */}
            
            <div className="photog-card-list">
                {photogs.length === 0 ? (
                    <div className="empty-photogs"></div>
                ) : (
                    photogs.map(photog => (
                        <div key={photog.USER_NO} className="photog-card">
                            
                            <div className="photog-info-section">
                                <div className="photog-profile-top"
                                    onClick={() => {
                                        // USER_NO(예: 15)를 암호화(예: 'aB8x9Zkq')하여 주소로 사용
                                        const hashedId = hashids.encode(photog.USER_NO);
                                        navigate(`/photog/${hashedId}`);
                                    }}>
                                    {photog.PROFILE_IMAGE_URL ? (
                                        <img 
                                            src={photog.PROFILE_IMAGE_URL} 
                                            alt="프로필 이미지" 
                                            className="photog-avatar"
                                        />
                                    ) : (
                                        <svg className="yt-photog-avatar" viewBox="0 0 24 24" fill="#ccc" xmlns="http://www.w3.org/2000/svg" style={{backgroundColor: '#f1f3f5'}}>
                                            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
                                        </svg>
                                    )}
                                    <div className="photog-name-box">
                                        <h3 className="photog-nickname">{photog.NICKNAME}</h3>
                                        <p className="photog-intro">{photog.INTRO || '소개글이 없습니다.'}</p>
                                    </div>
                                </div>

                                <div className="photog-stats">
                                    {/* 첫 번째 줄: 팔로워 / 팔로잉 */}
                                    <div className="stat-row">
                                        <div className="stat-group">
                                            <span>팔로워</span> <strong>{photog.FOLLOWER_COUNT || 0}</strong>
                                        </div>
                                        <span className="stat-divider">/</span>
                                        <div className="stat-group">
                                            <span>팔로잉</span> <strong>{photog.FOLLOWING_COUNT || 0}</strong>
                                        </div>
                                    </div>

                                    {/* 두 번째 줄: 좋아요 / 스크랩 */}
                                    <div className="stat-row">
                                        <div className="stat-group">
                                            <span>좋아요</span> <strong>{photog.TOTAL_LIKES || 0}</strong>
                                        </div>
                                        <span className="stat-divider">/</span>
                                        <div className="stat-group">
                                            <span>스크랩</span> <strong>{photog.TOTAL_SCRAPS || 0}</strong>
                                        </div>
                                    </div>

                                    {/* 세 번째 줄: 구분선 및 업데이트 */}
                                    <div className="stat-row update-time">
                                        <span>업데이트</span>
                                        <span>{photog.LAST_UPDATE ? photog.LAST_UPDATE : '기록 없음'}</span>
                                    </div>
                                </div>

                                <div className="photog-actions">
                                    <button 
                                        className={`btn-follow ${photog.IS_FOLLOWING === 'Y' ? 'following' : ''}`}
                                        onClick={() => handleFollowToggle(photog.USER_NO, photog.IS_FOLLOWING)}
                                    >
                                        {photog.IS_FOLLOWING === 'Y' ? '팔로우 취소' : '팔로우'}
                                    </button>
                                    <button 
                                        className="btn-message" 
                                        onClick={(e) => {
                                            e.stopPropagation(); // 💡 상위 요소의 클릭 이벤트(프로필 이동 등)가 실행되는 것을 방지
                                            
                                            // 💡 '/message' 부분은 App.js에 등록된 Message.js의 실제 라우터 주소로 맞춰주세요!
                                            navigate('/message', { 
                                                state: { targetPartner: photog } // 클릭한 작가의 전체 데이터를 state에 담아서 넘깁니다.
                                            });
                                        }}
                                    >
                                        메시지
                                    </button>
                                </div>
                            </div>

                            <div className="photog-photos-section">
                                {photog.topPhotos && photog.topPhotos.length > 0 ? (
                                    photog.topPhotos.map(photo => (
                                        <div 
                                            key={photo.PHOTO_ID} 
                                            className="rep-photo-wrapper"
                                            onClick={() => navigate(`/photo/${photo.PHOTO_ID}`)} // 🚀 3. 상세 페이지로 이동
                                        >
                                            <img 
                                                src={photo.THUMB_URL} 
                                                alt="대표 사진" 
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-photos">업로드한 사진이 없습니다.</div>
                                )}
                            </div>
                            
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default FollowGrid;