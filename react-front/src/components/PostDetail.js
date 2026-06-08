import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import AttachmentSection from './AttachmentSection'; 
import './css/PostDetail.css';

// 💡 1. 토큰 해독 함수 이식 (로컬 스토리지에서 진짜 로그인 유저 번호 추출)
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

    // 💡 2. 로그인한 유저 번호 상수에 저장
    const currentUserNo = getCurrentUserNo();

    // 💡 3. 댓글 등록 후에도 재사용할 수 있도록 함수를 useEffect 외부로 추출
    const fetchPostDetail = async () => {
        try {
            // 하드코딩 ?userNo=1 대신 동적 쿼리스트링 매칭
            const queryParam = currentUserNo ? `?userNo=${currentUserNo}` : '';
            const response = await fetch(`http://localhost:3010/post/${id}${queryParam}`);
            const data = await response.json();
            
            if (data.success) {
                setPost(data.post);
                setComments(data.comments || []);
                setAttachments(data.attachments || []);
                
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

    useEffect(() => {
        fetchPostDetail();
    }, [id]);

    // 좋아요 토글 핸들러
    const handleLikeToggle = async () => {
        if (!currentUserNo) { alert("로그인이 필요한 기능입니다."); return; } // 로그인 체크 방어막
        try {
            const nextState = !isLiked;
            const response = await fetch(`http://localhost:3010/post/${id}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isLiked: nextState, userNo: currentUserNo }) // 💡 실제 유저번호 송신
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
        if (!currentUserNo) { alert("로그인이 필요한 기능입니다."); return; } // 로그인 체크 방어막
        try {
            const nextState = !isScrapped;
            const response = await fetch(`http://localhost:3010/post/${id}/scrap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isScrapped: nextState, userNo: currentUserNo }) // 💡 실제 유저번호 송신
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
        if (!currentUserNo) { alert("댓글을 작성하려면 로그인이 필요합니다."); return; } // 로그인 체크 방어막
        if (!commentInput.trim()) return;

        try {
            const response = await fetch(`http://localhost:3010/post/${id}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentInput, userNo: currentUserNo }) // 💡 실제 유저번호 송신
            });
            const data = await response.json();
            if (data.success) {
                setCommentInput('');
                // 💡 가짜 '나' 배열을 넣는 대신, DB에 저장된 진짜 닉네임과 시퀀스 데이터를 새로고침합니다.
                fetchPostDetail(); 
            } else {
                alert(data.message || "댓글 등록에 실패했습니다.");
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

    const displayedComments = isCommentExpanded ? comments : comments.slice(0, 3);
    const images = post.THUMB_LIST || [];

    return (
        <div className="post-detail-container">
            <Header />

            <div className="detail-body">
                <div className="back-button-area">
                    <button className="btn-back" onClick={() => navigate(-1)}>&lt; 뒤로가기</button>
                </div>

                <div className="detail-content-wrapper">
                    <div className="detail-left">
                        <div className="post-text-content-box">
                            <div className="post-photog-header-yt">
                                {post.PROFILE_IMAGE_URL ? (
                                    <img src={post.PROFILE_IMAGE_URL} alt="프로필 이미지" className="yt-photog-avatar" />
                                ) : (
                                    <svg className="yt-photog-avatar" viewBox="0 0 24 24" fill="#ccc" xmlns="http://www.w3.org/2000/svg" style={{backgroundColor: '#f1f3f5'}}>
                                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
                                    </svg>
                                )}
                                <div className="yt-photog-meta">
                                    <span className="photog-name">{post.NICKNAME || `회원 ${post.USER_NO}`}</span>
                                    <span className="post-time-ago-yt">{formatTimeAgo(post.CREATED_AT)}</span>
                                </div>
                            </div>

                            <h2 className="post-title-yt">{post.TITLE}</h2>
                            <p className="post-body-text-yt">{post.CONTENT}</p>
                        </div>

                        {images.length > 0 && (
                            <div className="post-image-slider-box">
                                {images.length > 1 && (
                                    <button className="slider-btn left" onClick={() => setCurrentImgIdx(p => p === 0 ? images.length - 1 : p - 1)}>&lt;</button>
                                )}
                                <div className="slider-image-wrapper">
                                    <img src={images[currentImgIdx]} alt={`${post.TITLE} - ${currentImgIdx + 1}`} referrerPolicy="no-referrer" />
                                </div>
                                {images.length > 1 && (
                                    <button className="slider-btn right" onClick={() => setCurrentImgIdx(p => p === images.length - 1 ? 0 : p + 1)}>&gt;</button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="detail-right">
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

                        <div className="info-box comment-box">
                            <div className="comment-list-area" style={{textAlign: 'left'}}>
                                {(!comments || comments.length === 0) ? (
                                    <p className="empty-comment" style={{fontSize:'14px', color:'#868e96', textAlign:'center'}}>첫 댓글을 남겨보세요!</p>
                                ) : (
                                    <>
                                        {displayedComments.map(comment => (
                                            <div key={comment.COMMENT_ID} className="comment-item">
                                                <div className="comment-content-row">
                                                    <span className="comment-photog">{comment.NICKNAME}</span>
                                                    <span className="comment-text">{comment.CONTENT}</span>
                                                </div>
                                                <div className="comment-date">
                                                    {formatTimeAgo(comment.CREATED_AT)}
                                                </div>
                                            </div>
                                        ))}
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
                                <input type="text" placeholder="댓글 추가..." className="comment-input" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} />
                                <button type="submit" className="btn-submit">게시</button>
                            </form>
                        </div>

                        <div className="info-box metadata-display-box">
                            <div className="meta-display-item">
                                <h4 className="meta-display-label">카테고리</h4>
                                <p className="meta-display-value">{post.CATEGORIES || '미분류'}</p>
                            </div>
                            <div className="meta-display-item">
                                <h4 className="meta-display-label">태그</h4>
                                <p className="meta-display-value">{post.TAGS || '태그 없음'}</p>
                            </div>
                        </div>

                        <AttachmentSection attachments={attachments} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PostDetail;