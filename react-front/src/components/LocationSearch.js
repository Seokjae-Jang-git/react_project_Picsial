import React, { useState, useEffect, useRef } from 'react';
import './css/LocationSearch.css'; // 전용 CSS 연결

function LocationSearch({ value, onChange }) {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // 부모 컴포넌트에서 값이 바뀌면 동기화
    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    // 바깥 영역 클릭 시 드롭다운 닫기
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 💡 입력값이 바뀔 때마다 OpenStreetMap API 호출 (Debounce 적용)
    useEffect(() => {
        const fetchPlaces = async () => {
            if (query.trim().length < 2) {
                setResults([]);
                return;
            }
            try {
                // 무료 글로벌 지도 API (API 키 필요 없음)
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`);
                const data = await response.json();
                setResults(data);
            } catch (error) {
                console.error("장소 검색 에러:", error);
            }
        };

        // 타이핑할 때마다 API를 쏘는 것을 방지 (0.5초 대기 후 호출)
        const timeoutId = setTimeout(() => {
            if (isOpen) fetchPlaces();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query, isOpen]);

    const handleSelect = (placeName) => {
        setQuery(placeName);
        onChange(placeName); // 부모(Upload.js)의 상태 업데이트
        setIsOpen(false);
    };

    return (
        <div className="location-search-wrapper" ref={wrapperRef}>
            <div className="location-input-container">
                <span className="search-icon">🔍</span>
                <input 
                    type="text" 
                    className="form-input location-input"
                    placeholder="장소 검색 (예: 서울, 해운대)" 
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                {query && (
                    <button className="clear-icon" onClick={() => {
                        setQuery('');
                        onChange('');
                        setResults([]);
                    }}>✕</button>
                )}
            </div>

            {/* 자동완성 드롭다운 */}
            {isOpen && results.length > 0 && (
                <ul className="location-dropdown">
                    {results.map((place) => (
                        <li key={place.place_id} onClick={() => handleSelect(place.display_name)}>
                            <div className="place-name">{place.name || place.display_name.split(',')[0]}</div>
                            <div className="place-address">{place.display_name}</div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default LocationSearch;