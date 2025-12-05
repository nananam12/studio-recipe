package com.recipe.service;

import com.recipe.domain.entity.User;
import com.recipe.domain.dto.user.ChangePasswordRequestDTO;
import com.recipe.exceptions.user.UserExceptions;
import com.recipe.repository.LikeRepository;
import com.recipe.repository.UserRepository;
import com.recipe.repository.RecipeRepository;
import com.recipe.repository.UserReferencesRepository;
import com.recipe.repository.BookmarkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Log4j2
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final UserReferencesRepository userReferencesRepository;
    private final BookmarkRepository bookmarkRepository;
    private final PasswordEncoder passwordEncoder;
    private final RecipeRepository recipeRepository;

    // 회원 단건 조회 (PK인 userId로 조회)
    public User findByUser(Long userId){
        return userRepository.findByUserId(userId)
                .orElseThrow(UserExceptions.NOT_FOUND::getUserException);
    }

    // 이메일로 아이디 찾기 (로그인 아이디 반환)
    public String findUserIdByEmail(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(
                UserExceptions.NOT_FOUND::getUserException);
        return user.getId();
    }

    // 회원 가입 시 아이디/닉네임/이메일 중복 체크용
    public boolean checkExistsId(String id) {
        return userRepository.existsById(id);
    }

    public boolean checkExistsNickname(String nickname) {
        return userRepository.existsByNickname(nickname);
    }

    public void isUserExistsByEmail(String email) {
        userRepository.findByEmail(email)
                .orElseThrow(UserExceptions.NOT_FOUND::getUserException);
    }

    // 비밀번호 찾기 후 재설정
    @Transactional
    public void resetPassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(UserExceptions.NOT_FOUND::getUserException);

        String encodePassword = passwordEncoder.encode(newPassword);
        user.changePassword(encodePassword);
    }

    // 마이페이지 비밀번호 변경
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequestDTO request) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(UserExceptions.NOT_FOUND::getUserException);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPwd())) {
            throw UserExceptions.INVALID_PASSWORD.getUserException("현재 비밀번호가 일치하지 않습니다.");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw UserExceptions.INVALID_PASSWORD.getUserException("새 비밀번호가 서로 일치하지 않습니다.");
        }

        user.changePassword(passwordEncoder.encode(request.getNewPassword()));
    }

    // 회원 탈퇴 로직
    @Transactional
    public void deleteUser(String loginId, String password) {
        // 1. 로그인 아이디(String)로 사용자 조회
        User user = userRepository.findById(loginId)
                .orElseThrow(UserExceptions.NOT_FOUND::getUserException);

        // 2. 비밀번호 검증
        if (!passwordEncoder.matches(password, user.getPwd())) {
            throw UserExceptions.INVALID_PASSWORD.getUserException("비밀번호가 일치하지 않습니다.");
        }

        // 3. 연관 데이터 먼저 삭제 (외래키 제약조건 순서 중요!)
        Long userIdPk = user.getUserId();
        
        try {
            // ⭐ 순서 1: 좋아요 삭제
            likeRepository.deleteByUserId(userIdPk);
            log.info("좋아요 데이터 삭제 완료 - userId: {}", userIdPk);
            
            // ⭐ 순서 2: 북마크(찜) 삭제 - 추가!
            bookmarkRepository.deleteByUserId(userIdPk);
            log.info("북마크 데이터 삭제 완료 - userId: {}", userIdPk);
            
            // ⭐ 순서 3: 사용자 참조 삭제
            userReferencesRepository.deleteByUserId(userIdPk);
            log.info("사용자 참조 데이터 삭제 완료 - userId: {}", userIdPk);
            
            // ⭐ 순서 4: 작성한 레시피 삭제
            recipeRepository.deleteByUserId(userIdPk);
            log.info("레시피 데이터 삭제 완료 - userId: {}", userIdPk);
            
        } catch (Exception e) {
            log.error("연관 데이터 삭제 중 오류 발생: {}", e.getMessage());
            throw new RuntimeException("회원 탈퇴 중 오류가 발생했습니다.", e);
        }

        // 4. 사용자 삭제
        userRepository.delete(user);
        log.info("회원 탈퇴 완료: {}", loginId);
    }
}