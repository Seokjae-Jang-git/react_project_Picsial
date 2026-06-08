const express = require('express');
const router = express.Router();
const db = require('../db'); // 프로젝트의 DB 연결 모듈 경로에 맞게 확인해주세요
const oracledb = require('oracledb');

process.env.NLS_LANG = process.env.NLS_LANG;

// ==========================================
// [GET] /search - 글로벌 통합 검색 API
// ==========================================
router.get('/', async (req, res) => {
    let connection;
    try {
        const keyword = req.query.q;
        
        if (!keyword || keyword.trim() === '') {
            return res.json({ success: true, photos: [], posts: [], users: [] });
        }

        connection = await db.getConnection();

        // 1. 사진 검색 (검색망 대폭 확대 🚀)
        const photoSql = `
            SELECT DISTINCT 
                P.PHOTO_ID, P.TITLE, P.IMAGE_URL, P.THUMB_URL, P.VIEW_COUNT, P.LIKE_COUNT, 
                U.NICKNAME, U.PROFILE_IMAGE_URL
            FROM PS_PHOTO P
            JOIN PS_USER_INFO U ON P.USER_NO = U.USER_NO
            LEFT JOIN PS_PHOTO_CATEMAP PCM ON P.PHOTO_ID = PCM.PHOTO_ID
            LEFT JOIN PS_CATEGORY_PHOTO CP ON PCM.CATEGORY_ID = CP.CATEGORY_ID
            LEFT JOIN PS_PHOTO_TAGMAP PTM ON P.PHOTO_ID = PTM.PHOTO_ID
            LEFT JOIN PS_TAG_PHOTO TP ON PTM.TAG_ID = TP.TAG_ID
            WHERE (
                   -- 기존 검색 영역 (대소문자 무시 적용)
                   UPPER(P.TITLE) LIKE UPPER('%' || :keyword || '%')
                OR UPPER(P.DESCRIPTION) LIKE UPPER('%' || :keyword || '%')
                OR UPPER(CP.CATEGORY_NAME) LIKE UPPER('%' || :keyword || '%')
                OR UPPER(TP.TAG_NAME) LIKE UPPER('%' || :keyword || '%')
                
                -- 💡 [핵심 추가] 누락되었던 메타데이터 및 작가명까지 검색망 확대
                OR UPPER(P.LOCATION) LIKE UPPER('%' || :keyword || '%')      -- 촬영 장소
                OR UPPER(P.CAMERA_MODEL) LIKE UPPER('%' || :keyword || '%')  -- 카메라 기종
                OR UPPER(P.LENS) LIKE UPPER('%' || :keyword || '%')          -- 렌즈 정보
                OR UPPER(U.NICKNAME) LIKE UPPER('%' || :keyword || '%')      -- 작가 닉네임
            )
            -- 💡 (필수 권장) 공개된 사진만 검색되도록 처리 (ERD 기준)
            AND P.IS_PUBLIC = 'Y' 
            ORDER BY P.PHOTO_ID DESC
        `;
        const photoResult = await connection.execute(photoSql, { keyword }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // 💡 [요구사항 반영] 사진 결과 NAS URL 이미지 주소 조립 가공
        const processedPhotos = photoResult.rows.map(photo => ({
            ...photo,
            IMAGE_URL: photo.IMAGE_URL && photo.IMAGE_URL.startsWith('http') 
                ? photo.IMAGE_URL 
                : photo.IMAGE_URL ? `${process.env.NAS_BASE_URL}/${photo.IMAGE_URL}` : null,
            THUMB_URL: photo.THUMB_URL && photo.THUMB_URL.startsWith('http')
                ? photo.THUMB_URL 
                : photo.THUMB_URL ? `${process.env.NAS_BASE_URL}/${photo.THUMB_URL}` : null,
            PROFILE_IMAGE_URL: photo.PROFILE_IMAGE_URL && photo.PROFILE_IMAGE_URL.startsWith('http')
                ? photo.PROFILE_IMAGE_URL
                : photo.PROFILE_IMAGE_URL ? `${process.env.NAS_BASE_URL_PROFILE}/${photo.PROFILE_IMAGE_URL}` : null
        }));


        // 2. 게시물 검색 (제목, 내용, 카테고리명, 태그명 기준)
        // 💡 게시물 썸네일 경로 도출을 위한 스칼라 서브쿼리 보강
        const postSql = `
            SELECT DISTINCT 
                PO.POST_ID, PO.TITLE, DBMS_LOB.SUBSTR(PO.CONTENT, 500, 1) AS CONTENT, PO.VIEW_COUNT, PO.LIKE_COUNT, 
                U.NICKNAME, U.PROFILE_IMAGE_URL,
                (SELECT MIN(PI.THUMB_URL) FROM PS_POST_IMAGE PI WHERE PI.POST_ID = PO.POST_ID) AS THUMB_URL,
                (SELECT MIN(PI.IMAGE_URL) FROM PS_POST_IMAGE PI WHERE PI.POST_ID = PO.POST_ID) AS IMAGE_URL
            FROM PS_POST PO
            JOIN PS_USER_INFO U ON PO.USER_NO = U.USER_NO
            LEFT JOIN PS_POST_CATEMAP PCM ON PO.POST_ID = PCM.POST_ID
            LEFT JOIN PS_CATEGORY_POST CP ON PCM.CATEGORY_ID = CP.CATEGORY_ID
            LEFT JOIN PS_POST_TAGMAP PTM ON PO.POST_ID = PTM.POST_ID
            LEFT JOIN PS_TAG_POST TP ON PTM.TAG_ID = TP.TAG_ID
            WHERE PO.TITLE LIKE '%' || :keyword || '%'
               OR DBMS_LOB.INSTR(PO.CONTENT, :keyword) > 0  
               OR CP.CATEGORY_NAME LIKE '%' || :keyword || '%'
               OR TP.TAG_NAME LIKE '%' || :keyword || '%'
            ORDER BY PO.POST_ID DESC
        `;
        const postResult = await connection.execute(postSql, { keyword }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // 💡 [응용] 게시물 결과도 동일하게 NAS URL 이미지 주소 조립 가공 수행
        const processedPosts = postResult.rows.map(post => ({
            ...post,
            IMAGE_URL: post.IMAGE_URL && post.IMAGE_URL.startsWith('http') 
                ? post.IMAGE_URL 
                : post.IMAGE_URL ? `${process.env.NAS_BASE_URL_POS_IMG}/${post.IMAGE_URL}` : null,
            THUMB_URL: post.THUMB_URL && post.THUMB_URL.startsWith('http')
                ? post.THUMB_URL 
                : post.THUMB_URL ? `${process.env.NAS_BASE_URL_POS_IMG}/${post.THUMB_URL}` : null,
            PROFILE_IMAGE_URL: post.PROFILE_IMAGE_URL && post.PROFILE_IMAGE_URL.startsWith('http')
                ? post.PROFILE_IMAGE_URL
                : post.PROFILE_IMAGE_URL ? `${process.env.NAS_BASE_URL_PROFILE}/${post.PROFILE_IMAGE_URL}` : null
        }));


        // ==========================================
        // 3. 유저/작가 검색 (닉네임 기준 - 바인딩 보강 🛠️)
        // ==========================================
        
        // 💡 방법 A: 오라클에서 가장 안전하게 LIKE와 바인딩 변수를 결합하는 표준 문법입니다.
        // const userSql = `
        //     SELECT USER_NO, NICKNAME, PROFILE_IMAGE_URL, INTRO
        //     FROM PS_USER_INFO
        //     WHERE NICKNAME LIKE '%' || :keyword || '%'
        //     ORDER BY USER_NO DESC
        // `;
        // const userResult = await connection.execute(userSql, { keyword }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        // 만약 방법 A로 했는데도 전체 조회가 된다면, 
        // Node단에서 아예 퍼센트(%)를 붙여서 파라미터로 주입하는 방법 B가 확실합니다.
        const userSql = `
            SELECT USER_NO, NICKNAME, PROFILE_IMAGE_URL, INTRO
                FROM PS_USER_INFO
                WHERE NICKNAME LIKE :likeKeyword
                ORDER BY USER_NO DESC
        `;
        const userResult = await connection.execute(userSql, { likeKeyword: `%${keyword}%` }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const processedUsers = userResult.rows.map(user => ({
            ...user,
            PROFILE_IMAGE_URL: user.PROFILE_IMAGE_URL && user.PROFILE_IMAGE_URL.startsWith('http')
                ? user.PROFILE_IMAGE_URL
                : user.PROFILE_IMAGE_URL ? `${process.env.NAS_BASE_URL_PROFILE}/${user.PROFILE_IMAGE_URL}` : null
        }));


        // 💡 최종 가공된 데이터를 응답 객체에 실어 전송
        res.json({
            success: true,
            photos: processedPhotos,
            posts: processedPosts,
            users: processedUsers
        });

    } catch (error) {
        console.error("통합 검색 에러:", error);
        res.status(500).json({ success: false, message: "검색 중 오류가 발생했습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) {}
        }
    }
});

module.exports = router;