// routes/photog.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const oracledb = require('oracledb');
const Hashids = require('hashids/cjs'); // 🚀 Hashids 불러오기

// 🚀 암호화/복호화를 위한 열쇠(Salt)와 최소 길이(8자리) 설정
const hashids = new Hashids(process.env.REACT_APP_HASHIDS_SECRET, 8);

// 1. 작가 프로필 정보 조회 API (에러 원인 완벽 제거)
router.get('/profile/:hashedId', async (req, res) => {
    let connection;
    try {
        const hashedId = req.params.hashedId; 
        const myUserNo = req.query.myUserNo ? Number(req.query.myUserNo) : 0;

        const decoded = hashids.decode(hashedId);
        
        if (!decoded || decoded.length === 0) {
            return res.status(400).json({ success: false, message: "유효하지 않은 주소입니다." });
        }
        
        const targetUserNo = decoded[0]; 

        connection = await db.getConnection();
        
        const profileSql = `
            SELECT 
                U.USER_NO, U.NICKNAME, U.PROFILE_IMAGE_URL, U.INTRO,
                (SELECT COUNT(*) FROM PS_FOLLOW WHERE FOLLOWING_NO = U.USER_NO) AS FOLLOWER_COUNT,
                (SELECT COUNT(*) FROM PS_FOLLOW WHERE FOLLOWER_NO = U.USER_NO) AS FOLLOWING_COUNT,
                
                -- 💡 1. 좋아요 수 합산 (기존 정상 작동 확인됨)
                NVL((SELECT SUM(LIKE_COUNT) FROM PS_PHOTO WHERE USER_NO = U.USER_NO), 0) + 
                NVL((SELECT SUM(LIKE_COUNT) FROM PS_POST WHERE USER_NO = U.USER_NO), 0) AS TOTAL_LIKES,
                
                -- 💡 2. 스크랩 수 합산 (에러 원인 제거! 존재하는 PS_SCRAP_TABLE(게시물 스크랩)만 사용하여 카운트)
                NVL((SELECT COUNT(*) FROM PS_SCRAP_TABLE S JOIN PS_POST P ON S.POST_ID = P.POST_ID WHERE P.USER_NO = U.USER_NO), 0) AS TOTAL_SCRAPS,
                
                -- 💡 3. 최신 업데이트 날짜 추출
                TO_CHAR(
                    GREATEST(
                        NVL((SELECT MAX(CREATED_AT) FROM PS_PHOTO WHERE USER_NO = U.USER_NO), TO_DATE('1970-01-01', 'YYYY-MM-DD')),
                        NVL((SELECT MAX(CREATED_AT) FROM PS_POST WHERE USER_NO = U.USER_NO AND IS_PUBLIC = 'Y'), TO_DATE('1970-01-01', 'YYYY-MM-DD'))
                    ), 
                    'YYYY-MM-DD'
                ) AS LAST_UPDATE,
                
                CASE 
                    WHEN (SELECT COUNT(*) FROM PS_FOLLOW WHERE FOLLOWER_NO = :myUserNo AND FOLLOWING_NO = U.USER_NO) > 0 
                    THEN 'Y' ELSE 'N' 
                END AS IS_FOLLOWING
            FROM PS_USER_INFO U
            WHERE U.USER_NO = :targetUserNo
        `;
        const result = await connection.execute(profileSql, { myUserNo, targetUserNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "작가를 찾을 수 없습니다." });
        
        const profileData = result.rows[0];
        
        // 작성한 글이나 사진이 전혀 없는 유저의 경우 처리
        if (profileData.LAST_UPDATE === '1970-01-01') {
            profileData.LAST_UPDATE = null;
        }

        if (profileData.PROFILE_IMAGE_URL && !profileData.PROFILE_IMAGE_URL.startsWith('http')) {
            const profileBaseUrl = process.env.NAS_BASE_URL_PROFILE;
            if (profileBaseUrl) {
                profileData.PROFILE_IMAGE_URL = `${profileBaseUrl}/${profileData.PROFILE_IMAGE_URL}`;
            }
        }

        res.json({ success: true, profile: profileData });
    } catch (error) {
        console.error("작가 프로필 조회 에러:", error.message);
        res.status(500).json({ success: false, message: "서버 에러가 발생했습니다." });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});



// 2. 작가의 사진 목록 조회
// routes/photog.js - 2. 작가의 사진 목록 조회 API (케이스 A)
router.get('/photos/:userNo', async (req, res) => {
    let connection;
    try {
        const { userNo } = req.params;
        const { sort } = req.query; 
        
        connection = await db.getConnection();
        
        // 💡 스크랩 수와 댓글 수를 각각 안전한 스케일러 서브쿼리로 실시간 집계
        let sql = `
            SELECT P.*, 
                   (SELECT COUNT(*) FROM PS_SCRAP_TABLE WHERE PHOTO_ID = P.PHOTO_ID) AS SCRAP_COUNT,
                   (SELECT COUNT(*) FROM PS_COMMENT_TABLE WHERE PHOTO_ID = P.PHOTO_ID) AS COMMENT_COUNT
            FROM PS_PHOTO P 
            WHERE P.USER_NO = :userNo
        `;
        
        // 6가지 정렬 옵션 대응
        if (sort === 'oldest') sql += ` ORDER BY P.CREATED_AT ASC`;
        else if (sort === 'likes') sql += ` ORDER BY P.LIKE_COUNT DESC, P.PHOTO_ID DESC`;
        else if (sort === 'views') sql += ` ORDER BY P.VIEW_COUNT DESC, P.PHOTO_ID DESC`;
        else if (sort === 'scraps') sql += ` ORDER BY SCRAP_COUNT DESC, P.PHOTO_ID DESC`;
        else if (sort === 'comments') sql += ` ORDER BY COMMENT_COUNT DESC, P.PHOTO_ID DESC`; // 💡 집계된 별칭으로 정렬
        else sql += ` ORDER BY P.CREATED_AT DESC`; 

        const result = await connection.execute(sql, { userNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        const photos = result.rows.map(photo => ({
            ...photo,
            THUMB_URL: photo.THUMB_URL && photo.THUMB_URL.startsWith('http') ? photo.THUMB_URL : `${process.env.NAS_BASE_URL}/${photo.THUMB_URL}`
        }));
        
        res.json({ success: true, photos });
    } catch (error) {
        console.error("사진 목록 조회 에러:", error);
        res.status(500).json({ success: false });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// 3. 작가의 게시물 목록 조회 API (불필요한 로직 제거 및 6종 정렬 완벽 적용)
// ==========================================
router.get('/posts/:userNo', async (req, res) => {
    let connection;
    try {
        const { userNo } = req.params;
        const { sort } = req.query;
        
        connection = await db.getConnection();
        
        // 💡 카테고리/태그 등 불필요한 무거운 로직을 제거하고, 필요한 썸네일과 통계만 결합
        let sql = `
            SELECT 
                P.POST_ID, P.USER_NO, P.TITLE, P.CONTENT, P.VIEW_COUNT, P.LIKE_COUNT, P.CREATED_AT,
                NVL(S.SCRAP_COUNT, 0) AS SCRAP_COUNT,
                NVL(CM.COMMENT_COUNT, 0) AS COMMENT_COUNT,
                (
                    SELECT LISTAGG(IMG.THUMB_URL, ',') WITHIN GROUP (ORDER BY IMG.SORT_ORDER)
                    FROM PS_POST_IMAGE IMG
                    WHERE IMG.POST_ID = P.POST_ID
                ) AS ALL_THUMBS
            FROM PS_POST P
            -- 💡 스크랩 및 댓글 수를 미리 그룹화(GROUP BY)하여 카운트한 뒤 조인 (성능 최적화 및 에러 방지)
            LEFT JOIN (SELECT POST_ID, COUNT(*) AS SCRAP_COUNT FROM PS_SCRAP_TABLE GROUP BY POST_ID) S ON P.POST_ID = S.POST_ID
            LEFT JOIN (SELECT POST_ID, COUNT(*) AS COMMENT_COUNT FROM PS_COMMENT_TABLE GROUP BY POST_ID) CM ON P.POST_ID = CM.POST_ID
            WHERE P.USER_NO = :userNo
              AND P.IS_PUBLIC = 'Y' -- (공개된 게시물만 조회)
        `;

        // 💡 6가지 정렬 옵션 완벽 대응
        if (sort === 'oldest') {
            sql += ` ORDER BY P.POST_ID ASC`;
        } else if (sort === 'likes') {
            sql += ` ORDER BY P.LIKE_COUNT DESC, P.POST_ID DESC`;
        } else if (sort === 'views') {
            sql += ` ORDER BY P.VIEW_COUNT DESC, P.POST_ID DESC`;
        } else if (sort === 'scraps') {
            sql += ` ORDER BY SCRAP_COUNT DESC, P.POST_ID DESC`; // 조인된 별칭 사용
        } else if (sort === 'comments') {
            sql += ` ORDER BY COMMENT_COUNT DESC, P.POST_ID DESC`; // 조인된 별칭 사용
        } else {
            // 기본값: 최신 순
            sql += ` ORDER BY P.POST_ID DESC`; 
        }

        const result = await connection.execute(sql, { userNo }, { 
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            // 💡 CLOB 에러(순환 구조) 원천 차단
            fetchInfo: { CONTENT: { type: oracledb.STRING } } 
        });
        
        // 💡 콤마로 연결된 이미지 문자열을 프론트엔드 슬라이더 배열로 가공
        const processedPosts = result.rows.map(post => {
            const thumbList = post.ALL_THUMBS ? post.ALL_THUMBS.split(',') : [];
            const fullThumbUrls = thumbList.map(fileName => {
                if (fileName.startsWith('http')) return fileName; 
                return `${process.env.NAS_BASE_URL_POS_IMG || process.env.NAS_BASE_URL}/${fileName}`; 
            });

            return {
                ...post,
                THUMB_LIST: fullThumbUrls // 프론트엔드가 요구하는 배열 포맷
                // 카테고리/태그 파싱 로직은 불필요하여 삭제 완료
            };
        });
        
        res.json({ success: true, posts: processedPosts });

    } catch (error) {
        console.error("작가의 게시물 목록 조회 에러:", error.message);
        res.status(500).json({ 
            success: false, 
            message: "게시물을 불러오지 못했습니다.",
            errorDetails: error.message 
        });
    } finally {
        if (connection) { 
            try { await connection.close(); } catch (e) { console.error("커넥션 닫기 실패:", e); } 
        }
    }
});

module.exports = router;