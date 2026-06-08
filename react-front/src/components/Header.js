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

    // 💡 안 읽은 알림 개수 상태
    const [unreadCount, setUnreadCount] = useState(0);

    // 1. 초기 로그인 상태 및 유저 번호 파악
    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        
        if (token) {
            setIsLoggedIn(true);
            try {
                const decoded = jwtDecode(token);
                // 💡 myUserNo 대신 userNo를 확실하게 세팅 (둘 다 호환되도록 방어코드)
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

    // 💡 2. 유저 번호가 확인되면 백엔드에서 안 읽은 알림 개수 가져오기 (+ 커스텀 이벤트 리스너)
    useEffect(() => {
        // 알림 개수를 가져오는 함수를 따로 분리합니다.
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

        // 처음 렌더링될 때 한 번 실행
        fetchUnreadCount();

        // 💡 다른 컴포넌트(알림창)에서 'updateBadge'라는 방송을 하면, 다시 개수를 가져오도록 귀를 열어둡니다.
        window.addEventListener('updateBadge', fetchUnreadCount);

        // 컴포넌트가 꺼질 때는 귀를 닫아줍니다 (메모리 누수 방지)
        return () => {
            window.removeEventListener('updateBadge', fetchUnreadCount);
        };
    }, [userNo]);

    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        setUserNo(null);
        setUnreadCount(0); // 💡 로그아웃 시 알림도 0으로 초기화
        alert('로그아웃 되었습니다.');
        navigate('/');
        window.location.reload();
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        // 💡 검색 페이지로 검색어를 실어서 이동시킵니다.
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

                        {/* 💡 핵심 수정 파트: 알림 버튼을 뱃지와 함께 그룹화 */}
                        <div className="header-noti-wrapper">
                            <button className="header-user-btn" onClick={() => navigate('/notification')}>
                                알림
                            </button>
                            
                            {/* 안 읽은 알림이 1개 이상일 때만 빨간 뱃지 렌더링 */}
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