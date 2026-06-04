import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import AttachmentSection from './AttachmentSection';
import './css/PostDetail.css'; // 💡 PostDetail 전용 CSS 연결

// 💡 날짜를 'O분 전', 'O시간 전' 형식으로 완벽하게 변환하는 안전한 버전
function formatTimeAgo(dateString) {
    if (!dateString) return '';
    
    // 1. 먼저 들어온 문자열 그대로 Date 객체 파싱을 시도합니다. (표준 ISO 포맷 방어)
    let date = new Date(dateString);
    
    // 2. 만약 파싱에 실패해서 Invalid Date(NaN)가 되었다면, 구형 대안 포맷 적용
    if (isNaN(date.getTime()) && typeof dateString === 'string') {
        date = new Date(dateString.replace(/-/g, '/'));
    }
    
    // 3. 그럼에도 날짜가 비정상적이라면 안전하게 빈 문자열 반환
    if (isNaN(date.getTime())) return '정보 없음';
    
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

// 1. 컴포넌트 바깥에 토큰 해독 함수 배치
const getCurrentUserNo = () => {
    // Main.js에서 사용하는 이름과 동일하게 'jwtToken'을 가져옵니다.
    const token = localStorage.getItem('jwtToken'); 
    
    if (!token) return null; 

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const decoded = JSON.parse(jsonPayload);
        
        // 💡 백엔드 페이로드에 담은 키 이름이 'userNo' 이므로 아주 정확히 일치합니다!
        return decoded.userNo; 
    } catch (error) {
        console.error("토큰 디코딩 중 오류 발생:", error);
        return null;
    }
};

function PostDetail() {
    const { id } = useParams(); 
    const navigate = useNavigate();

    // 💡 렌더링 시점에 즉시 토큰을 까서 내 유저 번호를 확보합니다.
    const currentUserNo = getCurrentUserNo();
    
    // 데이터 상태 관리
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]); 
    const [attachments, setAttachments] = useState([]); // 💡 첨부파일 상태 추가
    
    // UI 상호작용 상태 관리
    const [commentInput, setCommentInput] = useState(''); 
    const [isCommentExpanded, setIsCommentExpanded] = useState(false);
    const [isLiked, setIsLiked] = useState(false); 
    const [likeCount, setLikeCount] = useState(0); 
    const [isScrapped, setIsScrapped] = useState(false);
    const [scrapCount, setScrapCount] = useState(0);
    
    // 💡 이미지 슬라이더 상태
    const [currentImgIdx, setCurrentImgIdx] = useState(0);

    const fetchPostDetail = async () => {
        try {
            const queryParam = currentUserNo ? `?userNo=${currentUserNo}` : '';
            // 💡 백엔드 API 엔드포인트를 /post/:id 로 가정
            const response = await fetch(`http://localhost:3010/post/${id}${queryParam}`);
            if (!response.ok) throw new Error('게시물 상세 정보 불러오기 실패');
            
            const data = await response.json();
            if (data.success) {
                setPost(data.post);
                setComments(data.comments || []); 
                setAttachments(data.attachments || []); // 첨부파일 데이터가 있다면 세팅
                setLikeCount(data.post.LIKE_COUNT || 0);
                setScrapCount(data.post.SCRAP_COUNT || 0);

                // 💡 [핵심] 백엔드가 알려준 상태를 보고 State를 덮어씁니다!
                // DB에서 COUNT(*)로 가져오기 때문에 값이 1 이상이면 true, 0이면 false가 됩니다.
                setIsLiked(data.post.IS_LIKED_BY_ME > 0); 
                setIsScrapped(data.post.IS_SCRAPPED_BY_ME > 0);
            }
        } catch (error) {
            console.error("게시물 상세 조회 에러:", error);
        }
    };

    useEffect(() => {
        fetchPostDetail();
    }, [id]);

    // 좋아요, 스크랩, 댓글 등록 로직은 기존 PhotoDetail과 동일하므로 URL만 post로 변경하여 사용
    // 💡 1. 좋아요 토글 핸들러
    const handleLikeToggle = async () => {
        // [방어 로직] 비로그인 유저 차단
        if (!currentUserNo) {
            alert("로그인이 필요한 기능입니다.");
            return;
        }

        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
        try {
            await fetch(`http://localhost:3010/post/${id}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 💡 하드코딩 1 제거 -> currentUserNo 적용
                body: JSON.stringify({ isLiked: newIsLiked, userNo: currentUserNo }) 
            });
        } catch (error) {
            setIsLiked(!newIsLiked);
            setLikeCount(prev => !newIsLiked ? prev + 1 : prev - 1);
        }
    };

    // 💡 2. 스크랩 토글 핸들러
    const handleScrapToggle = async () => {
        // [방어 로직] 비로그인 유저 차단
        if (!currentUserNo) {
            alert("로그인이 필요한 기능입니다.");
            return;
        }

        const newIsScrapped = !isScrapped;
        setIsScrapped(newIsScrapped);
        setScrapCount(prev => newIsScrapped ? prev + 1 : prev - 1);
        try {
            await fetch(`http://localhost:3010/post/${id}/scrap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 💡 하드코딩 1 제거 -> currentUserNo 적용
                body: JSON.stringify({ isScrapped: newIsScrapped, userNo: currentUserNo })
            });
        } catch (error) {
            setIsScrapped(!newIsScrapped);
            setScrapCount(prev => !newIsScrapped ? prev + 1 : prev - 1);
        }
    };

    // 💡 3. 댓글 등록 핸들러
    const handleCommentSubmit = async (e) => {
        e.preventDefault(); 
        
        // [방어 로직] 비로그인 유저 차단
        if (!currentUserNo) {
            alert("댓글을 작성하려면 로그인이 필요합니다.");
            return;
        }
        
        if (!commentInput.trim()) return;

        try {
            const response = await fetch(`http://localhost:3010/post/${id}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 💡 하드코딩 1 제거 -> currentUserNo 적용
                body: JSON.stringify({ content: commentInput, userNo: currentUserNo })
            });

            const data = await response.json();
            if (data.success) {
                setCommentInput(''); 
                fetchPostDetail(); // 댓글 작성 후 데이터 리프레시
                setIsCommentExpanded(true); 
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("댓글 등록 실패:", error);
            alert("댓글 등록 중 오류가 발생했습니다.");
        }
    };

    // 💡 슬라이더 좌우 이동 핸들러
    const handlePrevImage = () => {
        setCurrentImgIdx((prev) => (prev === 0 ? post.THUMB_LIST.length - 1 : prev - 1));
    };
    const handleNextImage = () => {
        setCurrentImgIdx((prev) => (prev === post.THUMB_LIST.length - 1 ? 0 : prev + 1));
    };

    if (!post) return <div className="loading-container">게시물을 불러오는 중입니다...</div>;

    const displayedComments = isCommentExpanded ? comments : comments.slice(0, 3);
    const images = post.THUMB_LIST || []; // DB에서 넘겨준 이미지 배열

    

    return (
        <div className="post-detail-container">
            <Header />

            <main className="detail-body">
                <div className="back-button-area">
                    <button onClick={() => navigate(-1)} className="btn-back">
                        &lt; 뒤로가기
                    </button>
                </div>

                <div className="detail-content-wrapper">
                    
                    {/* 💡 와이어프레임 기준: 좌측 영역 (본문 + 슬라이더) */}
                    <div className="detail-left">
                        {/* 1. 작성자 및 시간 헤더 */}
                        <div className="post-author-header">
                            <span className="post-author-name">{post.NICKNAME || `유저 ${post.USER_NO}`}</span>
                            <span className="post-time-ago">{formatTimeAgo(post.CREATED_AT)}</span>
                        </div>

                        {/* 2. 본문 텍스트 박스 */}
                        <div className="post-text-content-box">
                            <h2 className="post-title">{post.TITLE}</h2>
                            <p className="post-body-text">{post.CONTENT}</p>
                        </div>

                        {/* 3. 사진 슬라이더 박스 (사진이 있을 때만 노출) */}
                        {images.length > 0 && (
                            <div className="post-image-slider-box">
                                {images.length > 1 && (
                                    <button className="slider-btn prev" onClick={handlePrevImage}>&lt;</button>
                                )}
                                <div className="slider-image-wrapper">
                                    <img src={images[currentImgIdx]} alt={`첨부이미지 ${currentImgIdx + 1}`} />
                                </div>
                                {images.length > 1 && (
                                    <button className="slider-btn next" onClick={handleNextImage}>&gt;</button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ==========================================================================
                       💡 우측 통합 영역 (통계 ➔ 댓글 ➔ 카테고리/태그 ➔ 첨부파일)
                       ========================================================================== */}
                    <div className="detail-right">
                        
                        {/* 1. 통계 박스 */}
                        <div className="info-box action-stats-container">
                            <div className="stat-item">
                                <button className="icon-btn" onClick={handleLikeToggle}>
                                    <span className="icon-heart">{isLiked ? '❤️' : '♡'}</span>
                                </button>
                                <span className="stat-number">{likeCount}</span>
                            </div>
                            <div className="stat-item">
                                <button className="icon-btn" onClick={handleScrapToggle}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill={isScrapped ? "#333" : "none"} stroke="currentColor" strokeWidth="2">
                                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                </button>
                                <span className="stat-number">{scrapCount}</span>
                            </div>
                            <div className="stat-item">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <span className="stat-number">{post.VIEW_COUNT || 0}</span>
                            </div>
                        </div>

                        {/* 2. 🚀 댓글 박스 (통계 박스 바로 밑으로 위치 변경 완료) */}
                        <div className="info-box comment-box">
                            <div className="comment-list-area">
                                {(!comments || comments.length === 0) ? (
                                    <p className="empty-comment">첫 댓글을 남겨보세요!</p>
                                ) : (
                                    <>
                                        {/* 💡 3개 필터링 로직이 적용된 배열로 화면을 그립니다. */}
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
                                        
                                        {/* 💡 댓글이 3개보다 많을 때만 더보기/간략보기 버튼 등장 */}
                                        {comments.length > 3 && (
                                            <button className="btn-more-comments" onClick={() => setIsCommentExpanded(!isCommentExpanded)}>
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

                        {/* 3. 카테고리 및 태그 표시 영역 */}
                        <div className="info-box metadata-display-box">
                            <div className="meta-display-item">
                                <h4 className="meta-display-label">카테고리</h4>
                                <p className="meta-display-value">
                                    {post.CATEGORIES || '미분류'}
                                </p>
                            </div>
                            
                            <div className="meta-display-item">
                                <h4 className="meta-display-label">태그</h4>
                                <p className="meta-display-value">
                                    {post.TAGS || '태그 없음'}
                                </p>
                            </div>
                        </div>

                        {/* 4. 첨부파일 영역 */}
                        <AttachmentSection attachments={attachments} />

                    </div>
                </div>
            </main>
        </div>
    );
}

export default PostDetail;