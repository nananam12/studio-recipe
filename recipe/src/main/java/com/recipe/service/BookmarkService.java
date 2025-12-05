package com.recipe.service;

import com.recipe.domain.entity.Bookmark;
import com.recipe.domain.entity.User;
import com.recipe.domain.entity.Recipe;
import com.recipe.exceptions.recipe.RecipeException;
import com.recipe.repository.BookmarkRepository;
import com.recipe.repository.UserRepository;
import com.recipe.repository.RecipeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Log4j2
@Transactional
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;
    private final RecipeRepository recipeRepository;

    /**
     * 북마크 결과를 담는 내부 클래스
     */
    public static class BookmarkResult {
        private final boolean isBookmarked;

        public BookmarkResult(boolean isBookmarked) {
            this.isBookmarked = isBookmarked;
        }

        public boolean isBookmarked() {
            return isBookmarked;
        }
    }

    /**
     * 북마크 토글 (추가/삭제)
     */
    public BookmarkResult toggleBookmark(String username, Long recipeId) {
        log.info("북마크 토글 시작 - username: {}, recipeId: {}", username, recipeId);

        // 사용자 조회 (String id로 조회)
        User user = userRepository.findById(username)
                .orElseThrow(() -> {
                    log.error("사용자를 찾을 수 없음 - username: {}", username);
                    return new RecipeException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND);  // 수정
                });

        // 레시피 조회
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> {
                    log.error("레시피를 찾을 수 없음 - recipeId: {}", recipeId);
                    return new RecipeException("레시피를 찾을 수 없습니다.", HttpStatus.NOT_FOUND);  // 수정
                });

        // 기존 북마크 확인 (user.id는 String 타입)
        boolean exists = bookmarkRepository.existsByUserIdAndRcpSno(user.getId(), recipeId);

        if (exists) {
            // 북마크 삭제
            bookmarkRepository.deleteByUserIdAndRecipeRcpSno(user.getId(), recipeId);
            log.info("북마크 삭제 완료 - username: {}, recipeId: {}", username, recipeId);
            return new BookmarkResult(false);
        } else {
            // 북마크 추가
            Bookmark bookmark = Bookmark.builder()
                    .user(user)
                    .recipe(recipe)
                    .build();
            bookmarkRepository.save(bookmark);
            log.info("북마크 추가 완료 - username: {}, recipeId: {}", username, recipeId);
            return new BookmarkResult(true);
        }
    }

    /**
     * 북마크 여부 확인
     */
    @Transactional(readOnly = true)
    public boolean isBookmarked(String username, Long recipeId) {
        try {
            // String id로 사용자 조회
            User user = userRepository.findById(username)
                    .orElse(null);
            
            if (user == null) {
                return false;
            }

            Recipe recipe = recipeRepository.findById(recipeId)
                    .orElse(null);
            
            if (recipe == null) {
                return false;
            }

            // user.getId()는 String 타입
            return bookmarkRepository.existsByUserIdAndRcpSno(user.getId(), recipeId);
            
        } catch (Exception e) {
            log.warn("북마크 여부 확인 실패 - username: {}, recipeId: {}", username, recipeId, e);
            return false;
        }
    }
}