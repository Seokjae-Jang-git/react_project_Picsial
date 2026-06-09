import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import './css/Header.css';
import Hashids from 'hashids'; 

const hashids = new Hashids(process.env.REACT_APP_HASHIDS_SECRET, 8);

function Header() {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [userNo, setUserNo] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        
        if (token) {
            setIsLoggedIn(true);
            try {
                const decoded = jwtDecode(token);
                const currentUserNo = decoded.userNo || decoded.myUserNo;
                setUserNo(currentUserNo); 
            } catch (error) {
                console.error('헤더 토큰 디코딩 실패:', error);
                setIsLoggedIn(false);
            }
        } else {
            setIsLoggedIn(false);
            setUserNo(null);
        }
    }, []);

    useEffect(() => {
        const fetchUnreadCount = () => {
            if (userNo) {
                fetch(`http://localhost:3010/notification/unread-count?userNo=${userNo}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) setUnreadCount(data.count);
                    })
                    .catch(err => console.error("뱃지 카운트 조회 에러:", err));
            }
        };

        fetchUnreadCount();

        window.addEventListener('updateBadge', fetchUnreadCount);

        return () => {
            window.removeEventListener('updateBadge', fetchUnreadCount);
        };
    }, [userNo]);

    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        setUserNo(null);
        setUnreadCount(0); 
        alert('로그아웃 되었습니다.');
        navigate('/');
        window.location.reload();
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    };

    return (
        <header className="picsial-header">
            <div className="header-left">
                <img 
                    src={`${process.env.REACT_APP_NAS_BASE_URL_LOGO}/logo_picsial.png`} 
                    alt="Picsial Logo" 
                    className="header-logo-img" 
                    onClick={() => navigate('/')} 
                    style={{ cursor: 'pointer' }} 
                />
                <nav className="header-nav">
                    <button className="header-tab-btn active" onClick={() => navigate('/photo')}>사진</button>
                    <button className="header-tab-btn active" onClick={() => navigate('/post')}>게시물</button>
                    <button className="header-tab-btn active" onClick={() => navigate('/follow')}>팔로잉</button>
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
                        
                        <button className="header-user-btn" 
                            onClick={() => {
                                let currentUserNo = userNo;
                                if (!currentUserNo) {
                                    const token = localStorage.getItem('jwtToken');
                                    if (token) {
                                        try {
                                            const decoded = jwtDecode(token);
                                            currentUserNo = decoded.userNo || decoded.myUserNo; 
                                            setUserNo(currentUserNo); 
                                        } catch (e) {
                                            console.error("헤더 실시간 토큰 파싱 에러:", e);
                                        }
                                    }
                                }

                                if (!currentUserNo) {
                                    alert('유저 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
                                    return;
                                }

                                const hashedId = hashids.encode(Number(currentUserNo));
                                navigate(`/mypage/${hashedId}`);
                            }}
                        >
                            마이페이지
                        </button>
                        
                        <button className="header-user-btn" onClick={() => navigate('/message')}>메세지</button>

                        <div className="header-noti-wrapper">
                            <button className="header-user-btn" onClick={() => navigate('/notification')}>
                                알림
                            </button>
                            
                            {unreadCount > 0 && (
                                <span className="noti-badge">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>

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