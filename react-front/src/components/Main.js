import React, { useEffect, useState } from 'react';
import Header from './Header';
import './css/Main.css';

function Main() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        const loggedIn = !!token;
        setIsLoggedIn(loggedIn);

        // 1. 사진 섹션용 샘플 데이터 (6열 그리드용)
        const samplePhotos = Array.from({ length: 12 }, (_, i) => ({
            id: i + 1,
            title: loggedIn ? `맞춤형 사진 ${i + 1}` : `전체인기 사진 ${i + 1}`,
            likes: 120 - i * 10
        }));
        setPhotos(samplePhotos);

        // 2. 게시물 섹션용 샘플 데이터 (도안에 맞춘 세로형 카드 피드)
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
                id: 3,
                author: '게시자C',
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
                {/* 1. 사진 섹션 (기존 유지) */}
                <section className="content-section">
                    <div className="section-header">
                        <h2 className="section-title">사진</h2>
                        <button className="more-btn" onClick={() => alert('사진 더보기')}>더보기 &gt;</button>
                    </div>
                    <div className="photo-grid">
                        {photos.slice(0, 12).map((photo) => (
                            <div key={photo.id} className="photo-card">
                                <div className="photo-placeholder">사진</div>
                                <div className="card-info">
                                    <p className="card-title">{photo.title}</p>
                                    <span className="card-likes">❤️ {photo.likes}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 2. 게시물 섹션 (도안의 세로형 피드 카드 형태로 전면 수정) */}
                <section className="content-section">
                    <div className="section-header">
                        <h2 className="section-title">게시물</h2>
                        <button className="more-btn" onClick={() => alert('게시물 더보기')}>더보기 &gt;</button>
                    </div>
                    
                    {/* 세로형 카드들이 가로로 나열되는 컨테이너 */}
                    <div className="post-vertical-grid">
                        {posts.slice(0,6).map((post) => (
                            <div key={post.id} className="vertical-post-card">
                                {/* 최상단: 게시자 및 시간 */}
                                <div className="post-card-top">
                                    <span className="post-author">{post.author}</span>
                                    <span className="post-time">{post.time}</span>
                                </div>

                                {/* 중간 1: 게시글 본문 및 자세히보기 */}
                                <div className="post-card-content">
                                    <div className="post-text-box">
                                        <p className="post-main-text">{post.content}</p>
                                        <button className="btn-detail" onClick={() => alert('상세보기')}>자세히 보기</button>
                                    </div>
                                </div>

                                {/* 중간 2: 슬라이드형 사진 영역 (< 사진 >) */}
                                <div className="post-card-media">
                                    <button className="slide-arrow">&lt;</button>
                                    <div className="media-placeholder">사진</div>
                                    <button className="slide-arrow">&gt;</button>
                                </div>

                                {/* 최하단: 지표 데이터 통계 */}
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