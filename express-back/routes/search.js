const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const db = require('../db'); 

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
                   UPPER(P.TITLE) LIKE UPPER('%' || :keyword || '%')
                OR UPPER(P.DESCRIPTION) LIKE UPPER('%' || :keyword || '%')
                OR UPPER(CP.CATEGORY_NAME) LIKE UPPER('%' || :keyword || '%')
                OR UPPER(TP.TAG_NAME) LIKE UPPER('%' || :keyword || '%')
                OR UPPER(P.LOCATION) LIKE UPPER('%' || :keyword || '%')      
                OR UPPER(P.CAMERA_MODEL) LIKE UPPER('%' || :keyword || '%')  
                OR UPPER(P.LENS) LIKE UPPER('%' || :keyword || '%')          
                OR UPPER(U.NICKNAME) LIKE UPPER('%' || :keyword || '%')      
            )
            AND P.IS_PUBLIC = 'Y' 
            ORDER BY P.PHOTO_ID DESC
        `;
        const photoResult = await connection.execute(photoSql, { keyword }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

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

        const postSql = `
            SELECT DISTINCT 
                PO.POST_ID, PO.TITLE, DBMS_LOB.SUBSTR(PO.CONTENT, 500, 1) AS CONTENT, PO.VIEW_COUNT, PO.LIKE_COUNT, 
                U.NICKNAME, U.PROFILE_IMAGE_URL,
                (SELECT MIN(PI.THUMB_URL) FROM PS_POST_IMAGE PI WHERE PI.POST_ID = PO.POST_ID) AS THUMB_URL,
                (SELECT MIN(PI.IMAGE_URL) FROM PS_POST_IMAGE PI WHERE PI.POST_ID = PO.POST_ID) AS IMAGE_URL
            FROM PS_POST PO
            JOIN PS_USER_INFO U ON PO.USER_NO = U.USER_NO
            -- 💡 QUANT_POST_CATEMAP을 PS_POST_CATEMAP으로 수정했습니다!
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