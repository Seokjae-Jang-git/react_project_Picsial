import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'; 
import { jwtDecode } from 'jwt-decode';
import Header from '../components/Header';
import PhotogSide from './PhotogSide';
import PhotogPhGrid from './PhotogPhGrid';
import PhotogPoGrid from './PhotogPoGrid';

function Photog() {
    const navigate = useNavigate();
    const { hashedId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams(); 

    const [profile, setProfile] = useState(null);

    const viewType = searchParams.get('tab') || 'photo';
    const sortOption = searchParams.get('sort') || 'latest';

    const setViewType = (type) => {
        setSearchParams({ tab: type, sort: sortOption }, { replace: true });
    };

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
                
                <PhotogSide 
                    profile={profile} 
                    setProfile={setProfile} 
                    viewType={viewType}
                    setViewType={setViewType}
                    sortOption={sortOption}
                    setSortOption={setSortOption}
                />
                
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