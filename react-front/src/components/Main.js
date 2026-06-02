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

        // 💡 1. 백엔드에서 실제 사진 데이터 가져오기 (메인 화면용: 좋아요 순 정렬)
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

        fetchPhotos();

        // 2. 게시물 섹션용 샘플 데이터 (게시물 DB 연동 전까지 유지)
        setPosts([
            {
                id: 1,
                author: '게시자A',
                time: '2시간 전',
                content: '오늘 Picsial에 올릴 사진들을 정리해 보았습니다. 카테고리별로 정리가 잘 되어서 보기 좋네요.',
                views: 145,
                likes: 88,
                scraps: 12,
                comments: 5
            },
            {
                id: 2,
                author: '게시자B',
                time: '5시간 전',
                content: '이번 주말에 다녀온 출사지 공유합니다! 다들 사진 찍으러 갈 때 참고하세요.',
                views: 320,
                likes: 154,
                scraps: 45,
                comments: 21
            },
            {
                id: 3,
                author: '게시자C',
                time: 'Yesterday',
                content: '풍경 사진 잘 찍는 팁: 삼각대는 필수이고, 골든 아워를 절대 놓치지 마세요.',
                views: 98,
                likes: 42,
                scraps: 8,
                comments: 2
            },
            {
                id: 4,
                author: '게시자D',
                time: 'Yesterday',
                content: '풍경 사진 잘 찍는 팁: 삼각대는 필수이고, 골든 아워를 절대 놓치지 마세요.',
                views: 98,
                likes: 42,
                scraps: 8,
                comments: 2
            },
            {
                id: 5,
                author: '게시자E',
                time: 'Yesterday',
                content: '풍경 사진 잘 찍는 팁: 삼각대는 필수이고, 골든 아워를 절대 놓치지 마세요.',
                views: 98,
                likes: 42,
                scraps: 8,
                comments: 2
            },
            {
                id: 6,
                author: '게시자F',
                time: 'Yesterday',
                content: '풍경 사진 잘 찍는 팁: 삼각대는 필수이고, 골든 아워를 절대 놓치지 마세요.',
                views: 98,
                likes: 42,
                scraps: 8,
                comments: 2
            }
        ]);
    }, []);

    return (
        <div className="main-page-container">
            <Header />

            <main className="main-body">
                {/* 1. 사진 섹션 (실제 DB 연동 완료) */}
                <section className="content-section">
                    <div className="section-header">
                        <h2 className="section-title">사진</h2>
                        <button className="more-btn" onClick={()=>navigate('/photo')}>더보기 &gt;</button>
                    </div>
                    <div className="photo-grid">
                        {/* 💡 백엔드 데이터 컬럼명(PHOTO_ID, TITLE, LIKE_COUNT, THUMB_URL)으로 교체 */}
                        {photos.slice(0, 12).map((photo) => (
                            <div key={photo.PHOTO_ID} className="photo-card">
                                {/* 임시 글자 대신 진짜 썸네일 이미지 출력 */}
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

                {/* 2. 게시물 섹션 (기존 유지) */}
                <section className="content-section">
                    <div className="section-header">
                        <h2 className="section-title">게시물</h2>
                        <button className="more-btn" onClick={() => alert('게시물 더보기')}>더보기 &gt;</button>
                    </div>
                    
                    <div className="post-vertical-grid">
                        {posts.slice(0,6).map((post) => (
                            <div key={post.id} className="vertical-post-card">
                                <div className="post-card-top">
                                    <span className="post-author">{post.author}</span>
                                    <span className="post-time">{post.time}</span>
                                </div>

                                <div className="post-card-content">
                                    <div className="post-text-box">
                                        <p className="post-main-text">{post.content}</p>
                                        <button className="btn-detail" onClick={() => alert('상세보기')}>자세히 보기</button>
                                    </div>
                                </div>

                                <div className="post-card-media">
                                    <button className="slide-arrow">&lt;</button>
                                    <div className="media-placeholder">사진</div>
                                    <button className="slide-arrow">&gt;</button>
                                </div>

                                <div className="post-card-bottom">
                                    <span>조회 {post.views}</span>
                                    <span>좋아요 {post.likes}</span>
                                    <span>스크랩 {post.scraps}</span>
                                    <span>댓글 {post.comments}</span>
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