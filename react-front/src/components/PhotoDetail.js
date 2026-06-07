import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './css/PhotoDetail.css';

// 💡 날짜를 'O분 전', 'O시간 전' 형식으로 변환 (댓글용)
function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString.replace(/-/g, '/'));
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    return `${diffDay}일 전`;
}

// 💡 촬영 일자를 'yyyy-mm-dd hh:mi' 형식으로 변환
function formatShootDate(dateString) {
    if (!dateString) return '정보 없음';

    let date = new Date(dateString);

    if (isNaN(date.getTime())) {
        date = new Date(dateString.replace(/-/g, '/'));
    }

    if (isNaN(date.getTime())) return '정보 없음';

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

// 💡 토큰 해독 함수
const getCurrentUserNo = () => {
    const token = localStorage.getItem('jwtToken'); 
    if (!token) return null; 
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload).userNo; 
    } catch (error) {
        return null;
    }
};

function PhotoDetail() {
    const { id } = useParams(); 
    const navigate = useNavigate();
    
    const [photo, setPhoto] = useState(null);
    const [comments, setComments] = useState([]); 
    const [commentInput, setCommentInput] = useState(''); 
    const [isCommentExpanded, setIsCommentExpanded] = useState(false);
    const [isLiked, setIsLiked] = useState(false); 
    const [likeCount, setLikeCount] = useState(0); 
    const [isScrapped, setIsScrapped] = useState(false);
    const [scrapCount, setScrapCount] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    const currentUserNo = getCurrentUserNo();

    const fetchPhotoDetail = async () => {
        try {
            const queryParam = currentUserNo ? `?userNo=${currentUserNo}` : '';
            const response = await fetch(`http://localhost:3010/photo/${id}${queryParam}`);
            if (!response.ok) throw new Error('상세 정보 불러오기 실패');
            
            const data = await response.json();
            if (data.success) {
                setPhoto(data.photo);
                setComments(data.comments || []); 
                setLikeCount(data.photo.LIKE_COUNT || 0);
                setScrapCount(data.photo.SCRAP_COUNT || 0);

                // 백엔드 상태 적용
                setIsLiked(data.photo.IS_LIKED_BY_ME > 0); 
                setIsScrapped(data.photo.IS_SCRAPPED_BY_ME > 0);
                setIsFollowing(data.photo.IS_FOLLOWING_BY_ME > 0);
            }
        } catch (error) {
            console.error("사진 상세 조회 에러:", error);
            setComments([]); 
        }
    };

    useEffect(() => {
        fetchPhotoDetail();
    }, [id]);

    const handleLikeToggle = async () => {
        if (!currentUserNo) { alert("로그인이 필요한 기능입니다."); return; }

        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
        try {
            await fetch(`http://localhost:3010/photo/${id}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isLiked: newIsLiked, userNo: currentUserNo })
            });
        } catch (error) {
            setIsLiked(!newIsLiked);
            setLikeCount(prev => !newIsLiked ? prev + 1 : prev - 1);
        }
    };

    const handleScrapToggle = async () => {
        if (!currentUserNo) { alert("로그인이 필요한 기능입니다."); return; }

        const newIsScrapped = !isScrapped;
        setIsScrapped(newIsScrapped);
        setScrapCount(prev => newIsScrapped ? prev + 1 : prev - 1);
        try {
            await fetch(`http://localhost:3010/photo/${id}/scrap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isScrapped: newIsScrapped, userNo: currentUserNo })
            });
        } catch (error) {
            setIsScrapped(!newIsScrapped);
            setScrapCount(prev => !newIsScrapped ? prev + 1 : prev - 1);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault(); 
        if (!currentUserNo) { alert("댓글을 작성하려면 로그인이 필요합니다."); return; }
        if (!commentInput.trim()) return;

        try {
            const response = await fetch(`http://localhost:3010/photo/${id}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentInput, userNo: currentUserNo })
            });

            const data = await response.json();
            if (data.success) {
                setCommentInput(''); 
                fetchPhotoDetail(); 
                setIsCommentExpanded(true); 
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("댓글 등록 실패:", error);
            alert("댓글 등록 중 오류가 발생했습니다.");
        }
    };

    const handleFollowToggle = async () => {
        if (!currentUserNo) return alert("로그인이 필요합니다.");
        if (currentUserNo === photo.USER_NO) return alert("자기 자신은 팔로우할 수 없습니다.");

        const previousStatus = isFollowing;
        const targetUserNo = photo.USER_NO;

        // 프론트엔드 즉각 업데이트
        setIsFollowing(!previousStatus);

        try {
            const response = await fetch('http://localhost:3010/photo/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    followerNo: currentUserNo,
                    followingNo: targetUserNo
                })
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error("팔로우 토글 에러:", error);
            alert("처리 중 오류가 발생했습니다.");
            // 실패 시 롤백
            setIsFollowing(previousStatus);
        }
    };

    if (!photo) return <div className="loading-container">로딩 중...</div>;

    const displayedComments = isCommentExpanded ? comments : comments.slice(0, 3);

    return (
        <div className="detail-page-container">
            <Header />

            <main className="detail-body">
                <div className="back-button-area">
                    <button onClick={() => navigate(-1)} className="btn-back">
                        &lt; 뒤로가기
                    </button>
                </div>

                <div className="detail-content-wrapper">
                    
                    <div className="detail-left">
                        <img
                            src={photo.IMAGE_URL} alt={photo.TITLE} className="main-photo" 
                            onClick={() => setIsModalOpen(true)}
                        />
                    </div>

                    <div className="detail-right">
                        
                        <div className="info-box action-stats-container">
                            <div className="stat-item">
                                <button className="icon-btn" onClick={handleLikeToggle}>
                                    <span className="icon-heart">{isLiked ? '❤️' : '♡'}</span>
                                </button>
                                <span className="stat-number">{likeCount}</span>
                            </div>
                            <div className="stat-item">
                                <button className="icon-btn" onClick={handleScrapToggle}>
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill={isScrapped ? "#333" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                </button>
                                <span className="stat-number">{scrapCount}</span>
                            </div>
                            <div className="stat-item">
                                <div className="icon-view">
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                </div>
                                <span className="stat-number">{photo.VIEW_COUNT || 0}</span>
                            </div>
                        </div>

                        <div className="info-box comment-box">
                            <div className="comment-list-area">
                                {(!comments || comments.length === 0) ? (
                                    <p className="empty-comment">첫 댓글을 남겨보세요!</p>
                                ) : (
                                    <>
                                        {displayedComments.map(comment => (
                                            <div key={comment.COMMENT_ID} className="comment-item">
                                                <div className="comment-content-row">
                                                    <span className="comment-photog">유저 {comment.USER_NO}</span>
                                                    <span className="comment-text">{comment.CONTENT}</span>
                                                </div>
                                                <div className="comment-date">
                                                    {formatTimeAgo(comment.CREATED_AT)}
                                                </div>
                                            </div>
                                        ))}
                                        {comments.length > 3 && (
                                            <button className="btn-more-comments" onClick={() => setIsCommentExpanded(!isCommentExpanded)}>
                                                {isCommentExpanded ? '간략보기' : `댓글 ${comments.length - 3}개 더보기`}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                            <form onSubmit={handleCommentSubmit} className="comment-input-area">
                                <input type="text" placeholder="댓글 추가..." className="comment-input" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} />
                                <button type="submit" className="btn-submit">게시</button>
                            </form>
                        </div>

                        <div className="info-box metadata-box">
                            <h3 className="meta-section-title">사진 정보</h3>
                            <div className="meta-basic-info">
                                <p><strong>제목 :</strong> {photo.TITLE}</p>
                                <p><strong>설명 :</strong> {photo.DESCRIPTION || '설명이 없습니다.'}</p>
                                <p><strong>촬영일 :</strong> {formatShootDate(photo.SHOOT_DATE)}</p>
                                <p><strong>장소 :</strong> {photo.LOCATION || '정보 없음'}</p>
                                <p><strong>카테고리 :</strong> {photo.CATEGORY_NAME || '미분류'}</p>
                                <p><strong>태그 :</strong> {photo.TAGS || '태그 없음'}</p>
                            </div>

                            <div className="meta-exif-area">
                                <div className="exif-grid">
                                    <div className="exif-item exif-item-model">
                                        <span className="exif-label">기종</span>
                                        <span className="exif-value">{photo.CAMERA_MODEL || '-'}</span>
                                    </div>
                                    <div className="exif-item exif-item-focal">
                                        <span className="exif-label">초점거리</span>
                                        <span className="exif-value">{photo.FOCAL_LENGTH ? `${photo.FOCAL_LENGTH}mm` : '-'}</span>
                                    </div>
                                    <div className="exif-item exif-item-lens">
                                        <span className="exif-label">렌즈</span>
                                        <span className="exif-value">{photo.LENS || '-'}</span>
                                    </div>
                                    <div className="exif-item exif-item-aperture">
                                        <span className="exif-label">조리개</span>
                                        <span className="exif-value">{photo.APERTURE ? `f/${photo.APERTURE}` : '-'}</span>
                                    </div>
                                    <div className="exif-item exif-item-shutter">
                                        <span className="exif-label">셔터스피드</span>
                                        <span className="exif-value">
                                            {photo.SHUTTER_SPEED 
                                                ? `${parseFloat(photo.SHUTTER_SPEED).toFixed(4)}s` 
                                                : '-'}
                                        </span>
                                    </div>
                                    <div className="exif-item exif-item-iso">
                                        <span className="exif-label">ISO</span>
                                        <span className="exif-value">{photo.ISO || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="info-box profile-box">
                            <div className="profile-image-placeholder">
                                {photo.PROFILE_IMAGE_URL ? (
                                    <img 
                                        src={photo.PROFILE_IMAGE_URL} 
                                        alt="프로필" 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                    />
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="#ccc" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', backgroundColor: '#f1f3f5', borderRadius: '50%' }}>
                                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
                                    </svg>
                                )}
                            </div>
                            <p className="profile-nickname">{photo.NICKNAME || `유저 ${photo.USER_NO}`}</p>
                            
                            {currentUserNo !== photo.USER_NO && (
                                <button 
                                    className={`btn-follow ${isFollowing ? 'following' : ''}`}
                                    onClick={handleFollowToggle}
                                >
                                    {isFollowing ? '팔로우 취소' : '팔로우'}
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            </main>
            
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <img src={photo.IMAGE_URL} alt="원본" className="modal-image" />
                </div>
            )}

        </div>
    );
}

export default PhotoDetail;