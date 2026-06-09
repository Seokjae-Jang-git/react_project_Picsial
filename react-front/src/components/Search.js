import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import SearchSide from '../components/SearchSide';
import PhotoGrid from './PhotoGrid';  
import PostGrid from './PostGrid';    
import FollowGrid from './FollowGrid';

function Search() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || ''; 
    
    const [activeTab, setActiveTab] = useState('all');
    
    const [results, setResults] = useState({ photos: [], posts: [], users: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query) return;

        const fetchSearchResults = async () => {
            setLoading(true);
            try {
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
                <SearchSide activeTab={activeTab} setActiveTab={setActiveTab} results={results} />
                
                <main className="search-main-content" style={{ flex: 1, padding: '0 20px', textAlign: 'left' }}>
                    <h2>"{query}"에 대한 검색 결과</h2>
                    
                    {loading ? (
                        <div>검색 중입니다...</div>
                    ) : (
                        <div className="search-result-grids">
                            {(activeTab === 'all' || activeTab === 'photo') && (
                                <section style={{ marginBottom: '4px' }}>
                                    <h3>사진 검색 결과 ({results.photos.length})</h3>
                                    
                                    {results.photos.length > 0 ? (
                                        <PhotoGrid photos={results.photos} /> 
                                    ) : (
                                        <p style={{ color: '#868e96', textAlign: 'center', padding: '40px 0' }}>
                                            검색된 사진이 없습니다.
                                        </p>
                                    )}
                                </section>
                            )}

                            {(activeTab === 'all' || activeTab === 'post') && (
                                <section style={{ marginBottom: '4px', marginTop: '40px' }}>
                                    <h3>게시물 ({results.posts.length})</h3>
                                    
                                    {results.posts.length > 0 ? (
                                        <PostGrid posts={results.posts} />
                                    ) : (
                                        <p style={{ color: '#868e96', textAlign: 'center', padding: '40px 0' }}>
                                            검색된 게시물이 없습니다.
                                        </p>
                                    )}
                                </section>
                            )}

                            {(activeTab === 'all' || activeTab === 'photog') && (
                                <section style={{ marginBottom: '4px', marginTop: '40px' }}>
                                    <h3>작가/유저 ({results.users.length})</h3>
                                    
                                    {results.users.length > 0 ? (
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