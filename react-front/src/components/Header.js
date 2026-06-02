import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/Header.css';

function Header() {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        setIsLoggedIn(!!token);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        alert('로그아웃 되었습니다.');
        navigate('/');
        window.location.reload();
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        alert(`"${searchQuery}" 검색 요청`);
    };

    return (
        <header className="picsial-header">
            <div className="header-left">
                {/* 로고에 브랜드 정체성 부여 */}
                <div className="header-logo" onClick={() => navigate('/')}>
                    Picsial<span>.</span>
                </div>
                <nav className="header-nav">
                    <button className="header-tab-btn active" onClick={() => navigate('/photo')}>사진</button>
                    <button className="header-tab-btn active" onClick={() => navigate('/post')}>게시물</button>
                    <button className="header-tab-btn">팔로잉</button>
                </nav>
            </div>

            <form className="header-center" onSubmit={handleSearch}>
                <div className="search-bar-wrapper">
                    <input 
                        type="text" 
                        placeholder="트렌디한 사진과 게시물 검색" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="header-search-input"
                    />
                    <button type="submit" className="header-search-btn">🔍</button>
                </div>
            </form>

            <div className="header-right">
                {isLoggedIn ? (
                    <>
                        <button className="header-user-btn upload" onClick={() => navigate('/upload')}>업로드</button>
                        <button className="header-user-btn" onClick={() => navigate('/mypage')}>마이페이지</button>
                        <button className="header-user-btn" onClick={() => navigate('/messages')}>메세지</button>
                        <button className="header-user-btn" onClick={() => navigate('/notifications')}>알림</button>
                        <button className="header-auth-btn logout-btn" onClick={handleLogout}>로그아웃</button>
                    </>
                ) : (
                    <>
                        <button className="header-auth-btn login-btn" onClick={() => navigate('/login')}>로그인</button>
                    </>
                )}
            </div>
        </header>
    );
}

export default Header;