import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './css/PhotoDetail.css';

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

    const fetchPhotoDetail = async () => {
        try {
            const response = await fetch(`http://localhost:3010/photo/${id}`);
            if (!response.ok) throw new Error('상세 정보 불러오기 실패');
            
            const data = await response.json();
            if (data.success) {
                setPhoto(data.photo);
                setComments(data.comments || []); 
                setLikeCount(data.photo.LIKE_COUNT || 0);
                setScrapCount(data.photo.SCRAP_COUNT || 0);
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
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
        try {
            await fetch(`http://localhost:3010/photo/${id}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isLiked: newIsLiked }) 
            });
        } catch (error) {
            setIsLiked(!newIsLiked);
            setLikeCount(prev => !newIsLiked ? prev + 1 : prev - 1);
        }
    };

    const handleScrapToggle = async () => {
        const newIsScrapped = !isScrapped;
        setIsScrapped(newIsScrapped);
        setScrapCount(prev => newIsScrapped ? prev + 1 : prev - 1);
        try {
            await fetch(`http://localhost:3010/photo/${id}/scrap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isScrapped: newIsScrapped, userNo: 1 })
            });
        } catch (error) {
            setIsScrapped(!newIsScrapped);
            setScrapCount(prev => !newIsScrapped ? prev + 1 : prev - 1);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault(); 
        if (!commentInput.trim()) return;

        try {
            const response = await fetch(`http://localhost:3010/photo/${id}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentInput, userNo: 1 })
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
                        <img src={photo.IMAGE_URL} alt={photo.TITLE} className="main-photo" />
                    </div>

                    <div className="detail-right">
                        
                        {/* 💡 액션 통계 박스: 가로 일렬 배치 및 아이콘만 표시되도록 수정 */}
                        <div className="info-box action-stats-container">
                            {/* 좋아요 */}
                            <div className="stat-item">
                                <button className="icon-btn" onClick={handleLikeToggle}>
                                    <span className="icon-heart">{isLiked ? '❤️' : '♡'}</span>
                                </button>
                                <span className="stat-number">{likeCount}</span>
                            </div>

                            {/* 스크랩 */}
                            <div className="stat-item">
                                <button className="icon-btn" onClick={handleScrapToggle}>
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill={isScrapped ? "#333" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                </button>
                                <span className="stat-number">{scrapCount}</span>
                            </div>
                            
                            {/* 조회 */}
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
                                                    <span className="comment-author">유저 {comment.USER_NO}</span>
                                                    <span className="comment-text">{comment.CONTENT}</span>
                                                </div>
                                                <div className="comment-date">
                                                    {formatTimeAgo(comment.CREATED_AT)}
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {comments.length > 3 && (
                                            <button 
                                                className="btn-more-comments" 
                                                onClick={() => setIsCommentExpanded(!isCommentExpanded)}
                                            >
                                                {isCommentExpanded ? '간략보기' : `댓글 ${comments.length - 3}개 더보기`}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                            
                            <form onSubmit={handleCommentSubmit} className="comment-input-area">
                                <input 
                                    type="text" 
                                    placeholder="댓글 추가..." 
                                    className="comment-input" 
                                    value={commentInput}
                                    onChange={(e) => setCommentInput(e.target.value)}
                                />
                                <button type="submit" className="btn-submit">게시</button>
                            </form>
                        </div>

                        <div className="info-box metadata-box">
                            <p><strong>사진 이름 :</strong> {photo.TITLE}</p>
                            <p><strong>촬영 일자 :</strong> {photo.SHOOT_DATE || '정보 없음'}</p>
                            <p><strong>촬영 장소 :</strong> {photo.LOCATION || '정보 없음'}</p>
                            <p><strong>카테고리 :</strong> {photo.CATEGORY_NAME || '미분류'}</p>
                        </div>

                        <div className="info-box profile-box">
                            <div className="profile-image-placeholder">이미지</div>
                            <p className="profile-nickname">{photo.NICKNAME || `유저 ${photo.USER_NO}`}</p>
                            <button className="btn-follow">팔로우</button>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}

export default PhotoDetail;