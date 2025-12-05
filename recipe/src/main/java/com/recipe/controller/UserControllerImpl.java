package com.recipe.controller;

import com.recipe.controller.inter.UserController;
import com.recipe.domain.dto.auth.CustomerDetails;
import com.recipe.domain.dto.user.ChangePasswordRequestDTO;
import com.recipe.domain.dto.user.UserDeleteRequestDto;
import com.recipe.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Log4j2
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/user")  // ⭐ 변경: /user → /api/user
public class UserControllerImpl implements UserController {

    // ▼▼▼ [중요] 서비스가 연결되어 있어야 로직을 수행합니다. ▼▼▼
    private final UserService userService; 

    @Override
    @GetMapping("/my-pages/{userId}")
    public ResponseEntity<Void> myPage(@PathVariable("userId") Long userId) {
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "회원 상세 페이지 수정",
            description = "회원이 수정한 데이터로 회원 테이블 수정")
    @PutMapping("/my-pages")
    public ResponseEntity<Void> updateMyPage(/*@RequestBody*/) {
        return ResponseEntity.ok().build();
    }

    // ▼▼▼ [추가됨] 1. 비밀번호 변경 API ▼▼▼
    @Operation(summary = "비밀번호 변경", description = "로그인한 사용자의 비밀번호를 변경합니다.")
    @PatchMapping("/password")
    public ResponseEntity<String> changePassword(
            @AuthenticationPrincipal CustomerDetails customer,
            @RequestBody @Valid ChangePasswordRequestDTO request) {
        
        userService.changePassword(customer.getUserId(), request);
        return ResponseEntity.ok("비밀번호가 성공적으로 변경되었습니다.");
    }

    // ▼▼▼ [수정됨] 2. 회원 탈퇴 API - 인터페이스와 시그니처 맞춤 ▼▼▼
    @Override
    @Operation(summary = "회원 탈퇴", description = "비밀번호 확인 후 회원 탈퇴를 진행합니다.")
    @DeleteMapping("/delete")
    public ResponseEntity<Void> deleteUser(
            @RequestBody Map<String, String> request) {
        
        // SecurityContext에서 인증 정보 가져오기
        org.springframework.security.core.Authentication authentication = 
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        
        CustomerDetails customer = (CustomerDetails) authentication.getPrincipal();
        
        log.info("회원 탈퇴 요청 - 사용자 ID(PK): {}", customer.getUserId());
        
        String password = request.get("password");
        
        // CustomerDetails에서 로그인 ID(username)를 가져와서 삭제 요청
        userService.deleteUser(customer.getUsername(), password);

        return ResponseEntity.ok().build();
    }
}