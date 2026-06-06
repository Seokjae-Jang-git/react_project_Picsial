import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'; // 💡 useSearchParams 추가, useLocation 제거
import { jwtDecode } from 'jwt-decode';
import Header from '../components/Header';
import PhotogSide from './PhotogSide';
import PhotogPhGrid from './PhotogPhGrid';
import PhotogPoGrid from './PhotogPoGrid';

function Photog() {
    const navigate = useNavigate();
    const { hashedId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams(); // 💡 URL 쿼리 파라미터 제어용 훅 추가

    const [profile, setProfile] = useState(null);

    // 💡 기존 useState 대신 URL 주소(?tab=...&sort=...)에서 실시간으로 값을 읽어옵니다.
    // 주소창에 아무것도 없을 때 사용할 기본값('photo', 'latest')도 설정합니다.
    const viewType = searchParams.get('tab') || 'photo';
    const sortOption = searchParams.get('sort') || 'latest';

    // 💡 탭 상태를 바꿀 때 기존 히스토리를 덮어쓰도록 { replace: true } 추가
    const setViewType = (type) => {
        setSearchParams({ tab: type, sort: sortOption }, { replace: true });
    };

    // 💡 정렬 상태를 바꿀 때 기존 히스토리를 덮어쓰도록 { replace: true } 추가
    const setSortOption = (sort) => {
        setSearchParams({ tab: viewType, sort: sort }, { replace: true });
    };

    useEffect(() => {
        const fetchProfile = async () => {
            let myUserNo = 0;
            const token = localStorage.getItem('jwtToken');
            if (token) myUserNo = jwtDecode(token).userNo;

            try {
                const response = await fetch(`http://localhost:3010/photog/profile/${hashedId}?myUserNo=${myUserNo}`);
                const data = await response.json();
                
                if (data.success) {
                    setProfile(data.profile);
                } else {
                    alert("존재하지 않거나 유효하지 않은 주소입니다.");
                    navigate(-1);
                }
            } catch (error) {
                console.error("프로필 로드 실패:", error);
            }
        };
        
        if (hashedId) fetchProfile();
    }, [hashedId, navigate]);

    if (!profile) return <div>작가를 찾고 있습니다...</div>;

    return (
        <div className="follow-page-container">
            <Header />
            <div className="follow-page-body">
                
                {/* 🚀 왼쪽: 작가 전용 사이드바 (내려보내는 Props 명칭이 같아 내부 코드 수정이 필요 없습니다) */}
                <PhotogSide 
                    profile={profile} 
                    setProfile={setProfile} 
                    viewType={viewType}
                    setViewType={setViewType}
                    sortOption={sortOption}
                    setSortOption={setSortOption}
                />
                
                {/* 🚀 오른쪽: 라디오 버튼(viewType)에 따라 Grid 전환 */}
                <main className="follow-content-area" style={{ padding: '24px' }}>
                    {viewType === 'photo' ? (
                        <PhotogPhGrid 
                            userNo={profile?.USER_NO} 
                            sortOption={sortOption} 
                        />
                    ) : (
                        <PhotogPoGrid 
                            userNo={profile?.USER_NO} 
                            sortOption={sortOption} 
                        />
                    )}
                </main>

            </div>
        </div>
    );
}

export default Photog;