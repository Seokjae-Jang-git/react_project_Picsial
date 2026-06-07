const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const db = require('../db'); // DB 연결 모듈 경로 (프로젝트에 맞게 수정)

// ==========================================
// 1. [GET] /follow/photogs - 추천 작가 목록 및 통계/사진 가져오기
// ==========================================
router.get('/photogs', async (req, res) => {
    let connection;
    try {
        const userNo = Number(req.query.userNo);
        const sortOption = req.query.sort || 'followers';
        
        connection = await db.getConnection();

        let orderByClause = 'ORDER BY FOLLOWER_COUNT DESC';
        if (sortOption === 'updated') orderByClause = 'ORDER BY LAST_UPDATE DESC NULLS LAST';
        if (sortOption === 'likes') orderByClause = 'ORDER BY TOTAL_LIKES DESC';
        if (sortOption === 'scraps') orderByClause = 'ORDER BY TOTAL_SCRAPS DESC';

        const photogSql = `
            SELECT 
                U.USER_NO, U.NICKNAME, U.PROFILE_IMAGE_URL, U.INTRO,
                (SELECT COUNT(*) FROM PS_FOLLOW WHERE FOLLOWING_NO = U.USER_NO) AS FOLLOWER_COUNT,
                (SELECT COUNT(*) FROM PS_FOLLOW WHERE FOLLOWER_NO = U.USER_NO) AS FOLLOWING_COUNT,
                NVL((SELECT SUM(LIKE_COUNT) FROM PS_PHOTO WHERE USER_NO = U.USER_NO), 0) + 
                NVL((SELECT SUM(LIKE_COUNT) FROM PS_POST WHERE USER_NO = U.USER_NO), 0) AS TOTAL_LIKES,
                NVL((SELECT COUNT(*) FROM PS_SCRAP_TABLE S JOIN PS_POST P ON S.POST_ID = P.POST_ID WHERE P.USER_NO = U.USER_NO), 0) AS TOTAL_SCRAPS, 
                TO_CHAR(
                    GREATEST(
                        NVL((SELECT MAX(CREATED_AT) FROM PS_PHOTO WHERE USER_NO = U.USER_NO), TO_DATE('1970-01-01', 'YYYY-MM-DD')),
                        NVL((SELECT MAX(CREATED_AT) FROM PS_POST WHERE USER_NO = U.USER_NO AND IS_PUBLIC = 'Y'), TO_DATE('1970-01-01', 'YYYY-MM-DD'))
                    ), 
                    'YYYY-MM-DD'
                ) AS LAST_UPDATE,
                CASE 
                    WHEN (SELECT COUNT(*) FROM PS_FOLLOW WHERE FOLLOWER_NO = :userNo AND FOLLOWING_NO = U.USER_NO) > 0 
                    THEN 'Y' ELSE 'N' 
                END AS IS_FOLLOWING
            FROM PS_USER_INFO U
            WHERE U.USER_NO != :userNo
              AND EXISTS (SELECT 1 FROM PS_PHOTO P WHERE P.USER_NO = U.USER_NO)
            ${orderByClause}
        `;
        
        const photogResult = await connection.execute(photogSql, { userNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        // 💡 1단계: 프로필 이미지 URL 조립 (rows를 map으로 처리)
        const processedPhotogs = await Promise.all(photogResult.rows.map(async (user) => {
            let finalProfileUrl = user.PROFILE_IMAGE_URL;
            if (finalProfileUrl && !finalProfileUrl.startsWith('http')) {
                const profileBaseUrl = process.env.NAS_BASE_URL_PROFILE;
                if (profileBaseUrl) {
                    finalProfileUrl = `${profileBaseUrl}/${finalProfileUrl}`;
                }
            }

            // 💡 2단계: 각 작가별 대표 사진 5장 가져오기 (비동기 루프 처리)
            const photoSql = `
                SELECT PHOTO_ID, THUMB_URL
                FROM (SELECT PHOTO_ID, THUMB_URL FROM PS_PHOTO WHERE USER_NO = :photogNo ORDER BY LIKE_COUNT DESC)
                WHERE ROWNUM <= 5
            `;
            const photoResult = await connection.execute(photoSql, { photogNo: user.USER_NO }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            
            const topPhotos = photoResult.rows.map(photo => ({
                ...photo,
                THUMB_URL: (photo.THUMB_URL && photo.THUMB_URL.startsWith('http'))
                    ? photo.THUMB_URL
                    : `${process.env.NAS_BASE_URL}/${photo.THUMB_URL}`
            }));

            return {
                ...user,
                PROFILE_IMAGE_URL: finalProfileUrl,
                topPhotos: topPhotos
            };
        }));

        res.json({ success: true, photogs: processedPhotogs });

    } catch (error) {
        console.error("작가 목록 로드 에러:", error);
        res.status(500).json({ success: false, message: "작가 목록을 불러오는 중 오류가 발생했습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// 2. [POST] /follow/toggle - 팔로우 / 팔로우 취소 처리
// ==========================================
router.post('/toggle', async (req, res) => {
    let connection;
    try {
        const { followerNo, followingNo } = req.body;
        connection = await db.getConnection();

        // 1. 현재 팔로우 상태인지 확인
        const checkSql = `SELECT FOLLOW_ID FROM PS_FOLLOW WHERE FOLLOWER_NO = :followerNo AND FOLLOWING_NO = :followingNo`;
        const checkResult = await connection.execute(checkSql, { followerNo, followingNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        let action = '';
        if (checkResult.rows.length > 0) {
            // 2-A. 이미 팔로우 중이면 -> DELETE (팔로우 취소)
            const deleteSql = `DELETE FROM PS_FOLLOW WHERE FOLLOWER_NO = :followerNo AND FOLLOWING_NO = :followingNo`;
            await connection.execute(deleteSql, { followerNo, followingNo }, { autoCommit: false });
            action = 'unfollowed';
        } else {
            // 2-B. 팔로우 중이 아니면 -> INSERT (팔로우)
            // 🚀 사용자가 요청한 약속대로 CREATED_AT (SYSDATE) 제외
            const insertSql = `
                INSERT INTO PS_FOLLOW (FOLLOW_ID, FOLLOWER_NO, FOLLOWING_NO) 
                VALUES (PS_FOLLOW_SEQ.NEXTVAL, :followerNo, :followingNo)
            `;
            await connection.execute(insertSql, { followerNo, followingNo }, { autoCommit: false });
            action = 'followed';
        }

        await connection.commit();
        res.json({ success: true, action });

    } catch (error) {
        console.error("팔로우 토글 에러:", error);
        if (connection) {
            try { await connection.rollback(); } catch (e) { console.error("롤백 실패:", e); }
        }
        res.status(500).json({ success: false, message: "팔로우 처리 중 오류가 발생했습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// 3. [GET] /follow/list - 사이드바용 내 팔로잉 리스트 가져오기 (최신 업데이트 순 정렬 적용)
// ==========================================
router.get('/list', async (req, res) => {
    let connection;
    try {
        const userNo = Number(req.query.userNo);
        connection = await db.getConnection();

        // 💡 핵심: 사진(PS_PHOTO)과 게시물(PS_POST)의 작성일을 합쳐 가장 최신 날짜(LATEST_ACTIVITY)를 뽑아낸 뒤 정렬
        const listSql = `
            SELECT 
                U.USER_NO, 
                U.NICKNAME, 
                U.PROFILE_IMAGE_URL
            FROM PS_USER_INFO U
            JOIN PS_FOLLOW F ON U.USER_NO = F.FOLLOWING_NO
            LEFT JOIN (
                SELECT USER_NO, MAX(CREATED_AT) AS LATEST_ACTIVITY
                FROM (
                    SELECT USER_NO, CREATED_AT FROM PS_PHOTO
                    UNION ALL
                    SELECT USER_NO, CREATED_AT FROM PS_POST WHERE IS_PUBLIC = 'Y'
                )
                GROUP BY USER_NO
            ) ACT ON U.USER_NO = ACT.USER_NO
            WHERE F.FOLLOWER_NO = :userNo
            ORDER BY ACT.LATEST_ACTIVITY DESC NULLS LAST, F.FOLLOW_ID DESC
        `;
        
        const listResult = await connection.execute(listSql, { userNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // 💡 [수정] 여러 명의 팔로잉 유저 배열(rows)을 순회하며 각각의 프로필 URL을 조립합니다.
        const processedList = listResult.rows.map(user => {
            let finalProfileUrl = user.PROFILE_IMAGE_URL;
            
            // 프로필 이미지가 존재하고, 아직 http로 시작하는 풀 주소가 아니라면 조립!
            if (finalProfileUrl && !finalProfileUrl.startsWith('http')) {
                const profileBaseUrl = process.env.NAS_BASE_URL_PROFILE;
                if (profileBaseUrl) {
                    finalProfileUrl = `${profileBaseUrl}/${finalProfileUrl}`;
                }
            }

            // 원본 데이터에 조립된 URL을 덮어씌워서 반환합니다.
            return {
                ...user,
                PROFILE_IMAGE_URL: finalProfileUrl
            };
        });
        
        // 💡 조립이 완료된 processedList를 프론트엔드로 응답합니다.
        res.json({ success: true, followingList: processedList });

    } catch (error) {
        console.error("팔로잉 리스트 로드 에러:", error);
        res.status(500).json({ success: false, message: "팔로잉 리스트를 불러오지 못했습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// [GET] /follow/following - 내가 팔로잉 중인 작가 목록 및 통계 조회 (6가지 정렬 및 오타 수정 완료)
// ==========================================
router.get('/following', async (req, res) => {
    let connection;
    try {
        const userNo = Number(req.query.userNo);
        const sortOption = req.query.sort || 'following_latest';
        
        if (!userNo) {
            return res.status(400).json({ success: false, message: "유저 번호 누락" });
        }

        connection = await db.getConnection();

        // 정렬 조건문 구성
        let orderByClause = '';
        if (sortOption === 'followers') {
            orderByClause = 'ORDER BY FOLLOWER_COUNT DESC, U.USER_NO DESC';
        } else if (sortOption === 'following') {
            orderByClause = 'ORDER BY FOLLOWING_COUNT DESC, U.USER_NO DESC';
        } else if (sortOption === 'likes') {
            orderByClause = 'ORDER BY TOTAL_LIKES DESC, U.USER_NO DESC';
        } else if (sortOption === 'scraps') {
            orderByClause = 'ORDER BY TOTAL_SCRAPS DESC, U.USER_NO DESC';
        } else if (sortOption === 'following_oldest') {
            orderByClause = 'ORDER BY F_MAIN.FOLLOW_ID ASC'; 
        } else if (sortOption === 'updated') {
            orderByClause = 'ORDER BY LAST_UPDATE DESC NULLS LAST, U.USER_NO DESC';
        } else {
            orderByClause = 'ORDER BY F_MAIN.FOLLOW_ID DESC'; // 기본값: 최근 팔로우한 순
        }

        // 💡 핵심 수정: 서브쿼리 안의 && 를 오라클 표준 AND 로 교체 완료!
        const sql = `
            SELECT 
                U.USER_NO, U.NICKNAME, U.PROFILE_IMAGE_URL, U.INTRO,
                (SELECT COUNT(*) FROM PS_FOLLOW WHERE FOLLOWING_NO = U.USER_NO) AS FOLLOWER_COUNT,
                (SELECT COUNT(*) FROM PS_FOLLOW WHERE FOLLOWER_NO = U.USER_NO) AS FOLLOWING_COUNT,
                NVL((SELECT SUM(LIKE_COUNT) FROM PS_PHOTO WHERE USER_NO = U.USER_NO), 0) + 
                NVL((SELECT SUM(LIKE_COUNT) FROM PS_POST WHERE USER_NO = U.USER_NO), 0) AS TOTAL_LIKES,
                NVL((SELECT COUNT(*) FROM PS_SCRAP_TABLE S JOIN PS_POST P ON S.POST_ID = P.POST_ID WHERE P.USER_NO = U.USER_NO), 0) AS TOTAL_SCRAPS, 
                TO_CHAR(
                    GREATEST(
                        NVL((SELECT MAX(CREATED_AT) FROM PS_PHOTO WHERE USER_NO = U.USER_NO), TO_DATE('1970-01-01', 'YYYY-MM-DD')),
                        NVL((SELECT MAX(CREATED_AT) FROM PS_POST WHERE USER_NO = U.USER_NO AND IS_PUBLIC = 'Y'), TO_DATE('1970-01-01', 'YYYY-MM-DD'))
                    ), 
                    'YYYY-MM-DD'
                ) AS LAST_UPDATE,
                'Y' AS IS_FOLLOWING 
            FROM PS_USER_INFO U
            JOIN PS_FOLLOW F_MAIN ON U.USER_NO = F_MAIN.FOLLOWING_NO
            WHERE F_MAIN.FOLLOWER_NO = :userNo
            ${orderByClause}
        `;
        
        const result = await connection.execute(sql, { userNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        const processedList = result.rows.map(user => {
            let finalProfileUrl = user.PROFILE_IMAGE_URL;
            if (finalProfileUrl && !finalProfileUrl.startsWith('http')) {
                const profileBaseUrl = process.env.NAS_BASE_URL_PROFILE;
                if (profileBaseUrl) {
                    finalProfileUrl = `${profileBaseUrl}/${finalProfileUrl}`;
                }
            }
            return {
                ...user,
                PROFILE_IMAGE_URL: finalProfileUrl
            };
        });

        res.json({ success: true, list: processedList });

    } catch (error) {
        console.error("내 팔로잉 리스트 로드 에러:", error);
        res.status(500).json({ success: false, message: "팔로잉 리스트를 불러오지 못했습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

module.exports = router;