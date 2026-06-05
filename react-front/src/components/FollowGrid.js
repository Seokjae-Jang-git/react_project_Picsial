import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import './css/FollowGrid.css';

function FollowGrid({ sortOption }) {
    const [authors, setAuthors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const sortLabel = {
        'followers': '팔로워 순',
        'updated': '최근 업데이트 순',
        'likes': '좋아요 순',
        'scraps': '스크랩 순'
    };

    // 💡 1. 작가 목록 및 데이터 불러오기
    useEffect(() => {
        const fetchAuthors = async () => {
            setIsLoading(true);
            const token = localStorage.getItem('jwtToken');
            if (!token) return;

            try {
                const decoded = jwtDecode(token);
                // 백엔드 API 호출 (아직 안 만들었지만 미리 연결해둡니다)
                const response = await fetch(`http://localhost:3010/follow/authors?sort=${sortOption}&userNo=${decoded.userNo}`);
                const data = await response.json();
                
                if (data.success) {
                    setAuthors(data.authors);
                }
            } catch (error) {
                console.error("작가 목록 로드 실패:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAuthors();
    }, [sortOption]);

    // 💡 2. 팔로우 / 팔로우 취소 토글 로직
    const handleFollowToggle = async (targetUserNo, currentStatus) => {
        const token = localStorage.getItem('jwtToken');
        if (!token) return alert("로그인이 필요합니다.");

        try {
            const decoded = jwtDecode(token);
            
            // 프론트엔드 UI 즉각 업데이트 (Optimistic UI - 반응속도를 위해 먼저 바꿈)
            setAuthors(prev => prev.map(author => 
                author.USER_NO === targetUserNo 
                    ? { ...author, IS_FOLLOWING: currentStatus === 'Y' ? 'N' : 'Y' } 
                    : author
            ));

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

            if (!data.success) {
                // 실패 시 롤백
                alert("처리 중 오류가 발생했습니다.");
                setAuthors(prev => prev.map(author => 
                    author.USER_NO === targetUserNo ? { ...author, IS_FOLLOWING: currentStatus } : author
                ));
            }
        } catch (error) {
            console.error("팔로우 토글 에러:", error);
        }
    };

    if (isLoading) return <div className="follow-grid-loading">작가 데이터를 불러오는 중입니다...</div>;

    return (
        <div className="follow-grid-container">
            {/* 🚀 4. 요청하신 상단 '추천 작가 목록' 헤더 삭제 완료 */}
            
            <div className="author-card-list">
                {authors.length === 0 ? (
                    <div className="empty-authors">조건에 맞는 작가가 없습니다.</div>
                ) : (
                    authors.map(author => (
                        <div key={author.USER_NO} className="author-card">
                            
                            <div className="author-info-section">
                                <div className="author-profile-top">
                                    <img 
                                        src={author.PROFILE_IMAGE ? `http://localhost:3010/profile/${author.PROFILE_IMAGE}` : '/default-profile.png'} 
                                        alt="프로필" 
                                        className="author-avatar" 
                                    />
                                    <div className="author-name-box">
                                        <h3 className="author-nickname">{author.NICKNAME}</h3>
                                        <p className="author-intro">{author.INTRO || '소개글이 없습니다.'}</p>
                                    </div>
                                </div>

                                <div className="author-stats">
                                    <div className="stat-row"><span>팔로워</span> <strong>{author.FOLLOWER_COUNT}</strong></div>
                                    <div className="stat-row"><span>좋아요</span> <strong>{author.TOTAL_LIKES}</strong></div>
                                    <div className="stat-row"><span>스크랩</span> <strong>{author.TOTAL_SCRAPS}</strong></div>
                                    <div className="stat-row update-time">
                                        <span>업데이트</span> {author.LAST_UPDATE ? author.LAST_UPDATE : '기록 없음'}
                                    </div>
                                </div>

                                <div className="author-actions">
                                    <button 
                                        className={`btn-follow ${author.IS_FOLLOWING === 'Y' ? 'following' : ''}`}
                                        onClick={() => handleFollowToggle(author.USER_NO, author.IS_FOLLOWING)}
                                    >
                                        {author.IS_FOLLOWING === 'Y' ? '팔로우 취소' : '팔로우'}
                                    </button>
                                    <button className="btn-message" onClick={() => alert('메시지 기능은 준비 중입니다.')}>
                                        메시지
                                    </button>
                                </div>
                            </div>

                            <div className="author-photos-section">
                                {author.topPhotos && author.topPhotos.length > 0 ? (
                                    author.topPhotos.map(photo => (
                                        <div key={photo.PHOTO_ID} className="rep-photo-wrapper">
                                            <img 
                                                src={
                                                    photo.THUMB_URL.startsWith('http') 
                                                        ? photo.THUMB_URL 
                                                        // 🚀 여기만 REACT_APP_ 을 붙여줍니다!
                                                        : `${process.env.REACT_APP_NAS_BASE_URL}/${photo.THUMB_URL}`
                                                } 
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