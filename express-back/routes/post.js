const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const db = require('../db'); // DB 설정 경로에 맞게 수정해주세요

// ==========================================
// [GET] /post - 게시물 전체 목록 조회 (필터, 정렬, 썸네일, 태그 포함)
// ==========================================
router.get('/', async (req, res) => {
    let connection;
    try {
        const { category, sort } = req.query;
        connection = await db.getConnection();

        const bindParams = {};

        // 💡 1. 기본 SELECT 구문
        // - P.IS_PUBLIC = 'Y' 인 공개 게시물만 가져옵니다.
        // - I.SORT_ORDER = 1 인 첫 번째 이미지만 대표 썸네일로 조인합니다.
        // - LISTAGG 를 사용하여 게시물에 달린 다중 태그를 쉼표(,) 문자열로 한 번에 가져옵니다.
        let sql = `
            SELECT 
                P.POST_ID, P.USER_NO, P.TITLE, P.VIEW_COUNT, P.LIKE_COUNT, P.CREATED_AT,
                C.CATEGORY_ID, C.CATEGORY_NAME,
                I.IMAGE_URL, I.THUMB_URL, UI.NICKNAME,
                (
                    SELECT LISTAGG(T.TAG_NAME, ', ') WITHIN GROUP (ORDER BY T.TAG_NAME)
                    FROM PS_POST_TAGMAP TM
                    JOIN PS_TAG_POST T ON TM.TAG_ID = T.TAG_ID
                    WHERE TM.POST_ID = P.POST_ID
                ) AS TAGS
            FROM PS_POST P
            LEFT JOIN PS_POST_CATEMAP PC ON P.POST_ID = PC.POST_ID
            LEFT JOIN PS_CATEGORY_POST C ON PC.CATEGORY_ID = C.CATEGORY_ID
            LEFT JOIN PS_POST_IMAGE I ON P.POST_ID = I.POST_ID AND I.SORT_ORDER = 1
            LEFT JOIN PS_USER_INFO UI ON P.USER_NO = UI.USER_NO
            WHERE P.IS_PUBLIC = 'Y'
        `;

        // 💡 2. 카테고리 필터링 적용
        if (category && category.trim() !== '' && category !== 'undefined') {
            const parsedCategory = Number(category);
            if (!isNaN(parsedCategory)) { 
                sql += ` AND PC.CATEGORY_ID = :category`;
                bindParams.category = parsedCategory;
            }
        }

        // 💡 3. 동적 정렬 (Sort) 적용
        if (sort === 'likes') {
            sql += ` ORDER BY P.LIKE_COUNT DESC, P.POST_ID DESC`;
        } else if (sort === 'views') {
            sql += ` ORDER BY P.VIEW_COUNT DESC, P.POST_ID DESC`;
        } else if (sort === 'oldest') {
            sql += ` ORDER BY P.POST_ID ASC`;
        } else {
            // 기본값: 최신순 (latest)
            sql += ` ORDER BY P.POST_ID DESC`;
        }

        // 쿼리 실행
        const result = await connection.execute(sql, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // 💡 4. NAS URL 방어 코드 및 데이터 가공
        const processedPosts = result.rows.map(post => ({
            ...post,
            // 태그가 없으면 빈 배열 처리, 있으면 쉼표 기준으로 잘라서 배열로 변환
            TAGS: post.TAGS ? post.TAGS.split(', ') : [],
            // 이미지가 없는 텍스트 전용 게시물일 경우를 대비한 방어 코드
            IMAGE_URL: post.IMAGE_URL 
                ? (post.IMAGE_URL.startsWith('http') ? post.IMAGE_URL : `${process.env.NAS_BASE_URL}/${post.IMAGE_URL}`) 
                : null,
            THUMB_URL: post.THUMB_URL 
                ? (post.THUMB_URL.startsWith('http') ? post.THUMB_URL : `${process.env.NAS_BASE_URL}/${post.THUMB_URL}`)
                : null
        }));

        res.json({ success: true, posts: processedPosts });
    } catch (error) {
        console.error("게시물 목록 조회 에러:", error);
        res.status(500).json({ success: false, message: "게시물을 불러오지 못했습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

module.exports = router;