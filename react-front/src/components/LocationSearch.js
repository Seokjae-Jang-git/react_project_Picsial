import React, { useState, useEffect, useRef } from 'react';
import './css/LocationSearch.css'; 

function LocationSearch({ value, onChange }) {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchPlaces = async () => {
            if (query.trim().length < 2) {
                setResults([]);
                return;
            }
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`);
                const data = await response.json();
                setResults(data);
            } catch (error) {
                console.error("장소 검색 에러:", error);
            }
        };

        const timeoutId = setTimeout(() => {
            if (isOpen) fetchPlaces();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query, isOpen]);

    const handleSelect = (placeName) => {
        setQuery(placeName);
        onChange(placeName); 
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
                        const val = e.target.value;
                        setQuery(val);      
                        onChange(val);      
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