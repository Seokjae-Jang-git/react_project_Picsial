import React, { useState } from 'react';
import Header from '../components/Header'; 
import Sidebar from '../components/Sidebar'; 
import FollowGrid from './FollowGrid'; 
import './css/Follow.css';

function Follow() {
    const [sortOption, setSortOption] = useState('followers'); 
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    return (
        <div className="follow-page-container">
            <Header />

            <div className="follow-page-body">
                
                <Sidebar 
                    pageType="following" 
                    sortOption={sortOption}
                    setSortOption={setSortOption}
                    refreshTrigger={refreshTrigger} 
                />
                
                <main className="follow-content-area">
                    <FollowGrid 
                        sortOption={sortOption} 
                        onFollowChange={() => setRefreshTrigger(prev => prev + 1)} 
                    />
                </main>

            </div>
        </div>
    );
}

export default Follow;