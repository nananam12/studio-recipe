package com.recipe.config;

import com.recipe.config.JwtAuthenticationFilter;
import com.recipe.config.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;
    
    @Value("${front.url}")
    private String frontUrl;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration corsConfiguration = new CorsConfiguration();
        
        corsConfiguration.setAllowedOriginPatterns(List.of(frontUrl));
        corsConfiguration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));  // PATCH 추가
        corsConfiguration.setAllowedHeaders(List.of("*"));
        corsConfiguration.setAllowCredentials(true);
        corsConfiguration.setExposedHeaders(Arrays.asList("Authorization", "Refresh-Token"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfiguration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .httpBasic(AbstractHttpConfigurer::disable)
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize ->
                        authorize
                                // OPTIONS 요청 허용
                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                                
                                // 정적 리소스 허용
                                .requestMatchers("/images/**").permitAll()
                                
                                // 기본 페이지 허용
                                .requestMatchers("/", "/error").permitAll()
                                
                                // 프론트엔드 라우트 허용
                                .requestMatchers("/details/**").permitAll()
                                .requestMatchers("/search/**").permitAll()
                                .requestMatchers("/mypage/**").permitAll()
                                .requestMatchers("/write/**").permitAll()
                                
                                // 인증 관련 API
                                .requestMatchers("/auth/**").permitAll()
                                .requestMatchers("/api/auth/**").permitAll()
                                
                                // 공개 API (GET)
                                .requestMatchers(HttpMethod.GET, "/api/mainPages").permitAll()
                                .requestMatchers(HttpMethod.GET, "/api/search/**").permitAll()
                                .requestMatchers(HttpMethod.GET, "/api/recipes/**").permitAll()
                                .requestMatchers(HttpMethod.GET, "/api/details/**").permitAll()
                                
                                // 개발/테스트용
                                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                                .requestMatchers("/api/admin/**", "/batch/**").permitAll()
                                .requestMatchers("/test/**").permitAll()
                                
                                // ⭐ 인증 필요 API - /user/** 추가
                                .requestMatchers("/user/**").authenticated()  // 추가!
                                
                                // 인증 필요 API (POST/PUT/DELETE/PATCH)
                                .requestMatchers(HttpMethod.POST, "/api/recipes/write").authenticated()
                                .requestMatchers(HttpMethod.POST, "/api/details/likes").authenticated()
                                .requestMatchers(HttpMethod.POST, "/api/details/bookmarks").authenticated()
                                .requestMatchers(HttpMethod.POST, "/api/details/completion").authenticated()
                                .requestMatchers("/api/recommendations/**").authenticated()
                                .requestMatchers("/api/users/**").authenticated()
                                .requestMatchers("/api/user/**").authenticated()
                                .requestMatchers("/api/mypages/**").authenticated()
                                .requestMatchers("/api/mypage/**").authenticated()
                                
                                // 나머지 요청은 인증 필요
                                .anyRequest().authenticated()
                )
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}