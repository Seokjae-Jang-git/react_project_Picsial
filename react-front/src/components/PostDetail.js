import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import AttachmentSection from './AttachmentSection'; // 우리가 분리한 세련된 첨부파일 컴포넌트
import './css/PostDetail.css';

function PostDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // 데이터 바인딩 상태 관리
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // 비즈니스 기능 상태 관리
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isScrapped, setIsScrapped] = useState(false);
    const [scrapCount, setScrapCount] = useState(0);
    const [commentInput, setCommentInput] = useState('');
    const [isCommentExpanded, setIsCommentExpanded] = useState(false);
    const [currentImgIdx, setCurrentImgIdx] = useState(0);

    useEffect(() => {
        const fetchPostDetail = async () => {
            try {
                // 로그인 유저 1번 기준 데이터 요청
                const response = await fetch(`http://localhost:3010/post/${id}?userNo=1`);
                const data = await response.json();
                
                if (data.success) {
                    setPost(data.post);
                    setComments(data.comments || []);
                    setAttachments(data.attachments || []);
                    
                    // 좋아요/스크랩 초기 세팅
                    setLikeCount(data.post.LIKE_COUNT || 0);
                    setScrapCount(data.post.SCRAP_COUNT || 0);
                    setIsLiked(data.post.IS_LIKED_BY_ME > 0);
                    setIsScrapped(data.post.IS_SCRAPPED_BY_ME > 0);
                }
            } catch (error) {
                console.error("게시글 상세 조회 에러:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPostDetail();
    }, [id]);

    // 좋아요 토글 핸들러
    const handleLikeToggle = async () => {
        try {
            const nextState = !isLiked;
            const response = await fetch(`http://localhost:3010/post/${id}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isLiked: nextState, userNo: 1 })
            });
            const data = await response.json();
            if (data.success) {
                setIsLiked(nextState);
                setLikeCount(prev => nextState ? prev + 1 : Math.max(prev - 1, 0));
            }
        } catch (e) { console.error(e); }
    };

    // 스크랩 토글 핸들러
    const handleScrapToggle = async () => {
        try {
            const nextState = !isScrapped;
            const response = await fetch(`http://localhost:3010/post/${id}/scrap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isScrapped: nextState, userNo: 1 })
            });
            const data = await response.json();
            if (data.success) {
                setIsScrapped(nextState);
                setScrapCount(prev => nextState ? prev + 1 : Math.max(prev - 1, 0));
            }
        } catch (e) { console.error(e); }
    };

    // 댓글 제출 핸들러
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentInput.trim()) return;

        try {
            const response = await fetch(`http://localhost:3010/post/${id}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentInput, userNo: 1 })
            });
            const data = await response.json();
            if (data.success) {
                const newComment = {
                    COMMENT_ID: Date.now(),
                    USER_NO: 1,
                    NICKNAME: '나',
                    CONTENT: commentInput,
                    CREATED_AT: new Date().toISOString()
                };
                setComments(prev => [newComment, ...prev]);
                setCommentInput('');
            }
        } catch (error) { console.error(error); }
    };

    // 시간 포맷 처리 함수
    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        const postDate = new Date(dateString);
        const now = new Date();
        const diffMs = now - postDate;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (diffHrs < 24 && diffHrs > 0) return `${diffHrs}시간 전`;
        return postDate.toLocaleDateString('ko-KR');
    };

    if (loading) return <div className="loading-msg">로딩 중...</div>;
    if (!post) return <div className="error-msg">게시물을 찾을 수 없습니다.</div>;

    // 🚀 요구사항 반영: 최근 댓글 3개 제한 필터링 슬라이스 로직
    const displayedComments = isCommentExpanded ? comments : comments.slice(0, 3);
    const images = post.THUMB_LIST || [];

    return (
        <div className="post-detail-container">
            <Header />

            <div className="detail-body">
                
                {/* 뒤로가기 버튼 영역 */}
                <div className="back-button-area">
                    <button className="btn-back" onClick={() => navigate(-1)}>&lt; 뒤로가기</button>
                </div>

                <div className="detail-content-wrapper">
                    
                    {/* ==========================================================================
                       💡 좌측 영역 (유튜브 커뮤니티 스타일 헤더 + 폰트 밸런싱 본문 박스 + 슬라이더 박스)
                       ========================================================================== */}
                    <div className="detail-left">
                        
                        {/* 와이어프레임의 '게시글' 박스 */}
                        <div className="post-text-content-box">
                            
                            {/* 🚀 [유튜브 스타일] 작성자 프로필 상단 헤더 */}
                            <div className="post-author-header-yt">
                                <img 
                                    src="https://api.dicebear.com/7.x/bottts/svg?seed=picsial" 
                                    alt="프로필 이미지" 
                                    className="yt-author-avatar"
                                />
                                <div className="yt-author-meta">
                                    <span className="author-name">{post.NICKNAME || `회원 ${post.USER_NO}`}</span>
                                    {/* 🚀 요구사항: 닉네임 우측으로 간격이 확실하게 확보된 시간 배치 */}
                                    <span className="post-time-ago-yt">{formatTimeAgo(post.CREATED_AT)}</span>
                                </div>
                            </div>

                            {/* 🚀 요구사항: 제목과 본문의 과도한 크기 차이 교정 */}
                            <h2 className="post-title-yt">{post.TITLE}</h2>
                            <p className="post-body-text-yt">{post.CONTENT}</p>
                        </div>

                        {/* 와이어프레임의 '사진' 슬라이더 박스 */}
                        {images.length > 0 && (
                            /* 🚨 잃어버렸던 껍데기 박스 부활! (이게 없어서 모든 버그가 생겼습니다) */
                            <div className="post-image-slider-box">
                                
                                {images.length > 1 && (
                                    <button className="slider-btn left" onClick={() => setCurrentImgIdx(p => p === 0 ? images.length - 1 : p - 1)}>&lt;</button>
                                )}

                                <div className="slider-image-wrapper">
                                    <img 
                                        src={images[currentImgIdx]} 
                                        alt={`${post.TITLE} - ${currentImgIdx + 1}`} 
                                        referrerPolicy="no-referrer"
                                    />
                                </div>

                                {images.length > 1 && (
                                    <button className="slider-btn right" onClick={() => setCurrentImgIdx(p => p === images.length - 1 ? 0 : p + 1)}>&gt;</button>
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
                                    <span className="icon-heart" style={{fontSize: '20px', cursor: 'pointer'}}>{isLiked ? '❤️' : '♡'}</span>
                                </button>
                                <span className="stat-number">{likeCount}</span>
                            </div>
                            <div className="stat-item">
                                <button className="icon-btn" onClick={handleScrapToggle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill={isScrapped ? "#333" : "none"} stroke="currentColor" strokeWidth="2" style={{cursor: 'pointer'}}>
                                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                </button>
                                <span className="stat-number">{scrapCount}</span>
                            </div>
                            <div className="stat-item">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <span className="stat-number">{post.VIEW_COUNT || 0}</span>
                            </div>
                        </div>

                        {/* 2. 🚀 댓글 박스 (통계 박스 직후 배치 완료) */}
                        <div className="info-box comment-box">
                            <div className="comment-list-area" style={{textAlign: 'left'}}>
                                {(!comments || comments.length === 0) ? (
                                    <p className="empty-comment" style={{fontSize:'14px', color:'#868e96', textAlign:'center'}}>첫 댓글을 남겨보세요!</p>
                                ) : (
                                    <>
                                        {/* 잘라진 배열(displayedComments)을 기반으로 출력 */}
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
                                        
                                        {/* 🚀 댓글이 3개 초과일 때 동적 버튼 활성화 */}
                                        {comments.length > 3 && (
                                            <button 
                                                className="btn-submit" 
                                                style={{background:'none', color:'#065fd4', padding:0, fontSize:'13px', fontWeight:'600', textDecoration:'none'}} 
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

                        {/* 3. 카테고리 및 태그 박스 */}
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

                        {/* 4. 첨부파일 박스 (독립 컴포넌트 호출) */}
                        <AttachmentSection attachments={attachments} />

                    </div>

                </div>
            </div>
        </div>
    );
}

export default PostDetail;