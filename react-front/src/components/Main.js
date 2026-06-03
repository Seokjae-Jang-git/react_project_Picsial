import React, { useEffect, useState } from 'react';
import Header from './Header';
import { useNavigate } from 'react-router-dom';

import './css/Main.css';

function Main() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [posts, setPosts] = useState([]);

    const navigate = useNavigate();
    
    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        const loggedIn = !!token;
        setIsLoggedIn(loggedIn);

        // 💡 1. 백엔드에서 사진 데이터 가져오기
        const fetchPhotos = async () => {
            try {
                const response = await fetch('http://localhost:3010/photo?sort=likes');
                if (!response.ok) {
                    throw new Error(`HTTP 에러! 상태코드: ${response.status}`);
                }
                const data = await response.json();
                
                if (data.success) {
                    setPhotos(data.photos); 
                }
            } catch (error) {
                console.error("메인 페이지 사진 가져오기 실패:", error);
            }
        };

        // 💡 2. 백엔드에서 게시물 데이터 가져오기 (신규 추가!)
        const fetchPosts = async () => {
            try {
                // 메인 화면이니까 최신순(기본값)으로 6개만 가져오도록 호출합니다.
                const response = await fetch('http://localhost:3010/post?sort=likes');
                if (!response.ok) {
                    throw new Error(`HTTP 에러! 상태코드: ${response.status}`);
                }
                const data = await response.json();
                
                if (data.success) {
                    setPosts(data.posts); 
                }
            } catch (error) {
                console.error("메인 페이지 게시물 가져오기 실패:", error);
            }
        };

        fetchPhotos();
        fetchPosts(); // 게시물 API 호출 실행

    }, []);

    // 날짜 포맷 변환 함수 (예: 2026. 06. 03)
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR');
    };

    return (
        <div className="main-page-container">
            <Header />

            <main className="main-body">
                {/* 1. 사진 섹션 */}
                <section className="content-section">
                    <div className="section-header">
                        <h2 className="section-title">사진</h2>
                        <button className="more-btn" onClick={()=>navigate('/photo')}>더보기 &gt;</button>
                    </div>
                    <div className="photo-grid">
                        {photos.slice(0, 12).map((photo) => (
                            <div key={photo.PHOTO_ID} className="photo-card">
                                <div style={{ width: '100%', height: '200px', overflow: 'hidden', borderRadius: '8px' }}>
                                    <img 
                                        src={photo.THUMB_URL} 
                                        alt={photo.TITLE} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <div className="card-info">
                                    <p className="card-title">{photo.TITLE}</p>
                                    <span className="card-likes">❤️ {photo.LIKE_COUNT || 0}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 2. 게시물 섹션 (API 연동 완료) */}
                <section className="content-section">
                    <div className="section-header">
                        <h2 className="section-title">게시물</h2>
                        <button className="more-btn" onClick={() => navigate('/post')}>더보기 &gt;</button>
                    </div>
                    
                    <div className="post-vertical-grid">
                        {/* 💡 DB에서 가져온 posts 배열을 매핑합니다. */}
                        {posts.slice(0,6).map((post) => (
                            <div key={post.POST_ID} className="vertical-post-card">
                                <div className="post-card-top">
                                    <span className="post-author">{post.NICKNAME}</span>
                                    <span className="post-time">{formatDate(post.CREATED_AT)}</span>
                                </div>

                                <div className="post-card-content">
                                    <div className="post-text-box">
                                        {/* API에서 본문(CONTENT) 대신 제목(TITLE)을 메인 텍스트로 활용 */}
                                        <p className="post-main-text">{post.TITLE}</p>
                                        <button className="btn-detail" onClick={() => alert('상세보기 구현 예정')}>자세히 보기</button>
                                    </div>
                                </div>

                                <div className="post-card-media">
                                    {/* 💡 대표 이미지(THUMB_URL)가 있을 때만 렌더링 */}
                                    {post.THUMB_URL ? (
                                        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '8px' }}>
                                            <img 
                                                src={post.THUMB_URL} 
                                                alt={post.TITLE} 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    ) : (
                                        // 이미지가 없는 게시물일 경우의 대체 UI
                                        <div className="media-placeholder" style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100%', background:'#f1f3f5', borderRadius:'8px', color:'#adb5bd' }}>
                                            사진 없음
                                        </div>
                                    )}
                                </div>

                                <div className="post-card-bottom">
                                    <span>조회 {post.VIEW_COUNT || 0}</span>
                                    <span>좋아요 {post.LIKE_COUNT || 0}</span>
                                    <span>스크랩 0</span> {/* 💡 스크랩, 댓글 API는 아직 미구현이므로 0으로 하드코딩 */}
                                    <span>댓글 0</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default Main;