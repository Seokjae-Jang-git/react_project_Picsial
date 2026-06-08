import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import SearchSide from '../components/SearchSide';
import PhotoGrid from './PhotoGrid';  // 기존 그리드 컴포넌트 임포트
import PostGrid from './PostGrid';    // 기존 그리드 컴포넌트 임포트
import FollowGrid from './FollowGrid';

function Search() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || ''; // URL에서 ?q=값 꺼내기
    
    // 왼쪽 사이드바에서 선택한 탭 상태 관리 ('all', 'photo', 'post', 'photog')
    const [activeTab, setActiveTab] = useState('all');
    
    // 검색 결과 데이터 상태 관리
    const [results, setResults] = useState({ photos: [], posts: [], users: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query) return;

        const fetchSearchResults = async () => {
            setLoading(true);
            try {
                // 💡 백엔드 글로벌 검색 API 호출
                const response = await fetch(`http://localhost:3010/search?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                if (data.success) {
                    setResults({
                        photos: data.photos || [],
                        posts: data.posts || [],
                        users: data.users || []
                    });
                }
            } catch (error) {
                console.error("검색 실패:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSearchResults();
    }, [query]);

    return (
        <div className="search-page-container">
            <Header />
            <div className="search-body" style={{ display: 'flex', marginTop: '20px' }}>
                {/* 왼쪽 사이드바 (필터 제어) */}
                <SearchSide activeTab={activeTab} setActiveTab={setActiveTab} results={results} />
                
                {/* 오른쪽 검색 결과 영역 */}
                <main className="search-main-content" style={{ flex: 1, padding: '0 20px', textAlign: 'left' }}>
                    <h2>"{query}"에 대한 검색 결과</h2>
                    
                    {loading ? (
                        <div>검색 중입니다...</div>
                    ) : (
                        <div className="search-result-grids">
                            {/* 💡 탭 선택에 따른 동적 렌더링 영역 */}
                            {/* ==========================================
                               1. 사진 검색 결과 영역
                               ========================================== */}
                            {(activeTab === 'all' || activeTab === 'photo') && (
                                <section style={{ marginBottom: '4px' }}>
                                    <h3>사진 검색 결과 ({results.photos.length})</h3>
                                    
                                    {/* 💡 핵심: 기존 컴포넌트 규격에 맞춰 검색 결과를 photos 매개변수로 꽂아줍니다! */}
                                    {results.photos.length > 0 ? (
                                        <PhotoGrid photos={results.photos} /> 
                                    ) : (
                                        <p style={{ color: '#868e96', textAlign: 'center', padding: '40px 0' }}>
                                            검색된 사진이 없습니다.
                                        </p>
                                    )}
                                </section>
                            )}

                            {/* ==========================================
                               2. 게시물 검색 결과 영역
                               ========================================== */}
                            {(activeTab === 'all' || activeTab === 'post') && (
                                <section style={{ marginBottom: '4px', marginTop: '40px' }}>
                                    <h3>게시물 ({results.posts.length})</h3>
                                    
                                    {results.posts.length > 0 ? (
                                        /* 💡 명칭 매칭: 기존 컴포넌트 규칙이 posts={...} 일 때 */
                                        <PostGrid posts={results.posts} />
                                    ) : (
                                        <p style={{ color: '#868e96', textAlign: 'center', padding: '40px 0' }}>
                                            검색된 게시물이 없습니다.
                                        </p>
                                    )}
                                </section>
                            )}

                            {/* ==========================================
                               3. 작가/유저 검색 결과 영역
                               ========================================== */}
                            {(activeTab === 'all' || activeTab === 'photog') && (
                                <section style={{ marginBottom: '4px', marginTop: '40px' }}>
                                    <h3>작가/유저 ({results.users.length})</h3>
                                    
                                    {results.users.length > 0 ? (
                                        /* 💡 여기서 users={results.users} 라고 이름을 맞춰서 보내주면 됩니다! */
                                        <FollowGrid users={results.users} />
                                    ) : (
                                        <p style={{ color: '#868e96', textAlign: 'center', padding: '40px 0' }}>
                                            검색된 유저가 없습니다.
                                        </p>
                                    )}
                                </section>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default Search;