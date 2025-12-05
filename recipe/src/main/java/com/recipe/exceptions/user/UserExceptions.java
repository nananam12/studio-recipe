package com.recipe.exceptions.user;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum UserExceptions {
    NOT_FOUND("NOT_FOUND", HttpStatus.NOT_FOUND),
    CONFLICT("CONFLICT", HttpStatus.CONFLICT),
    INVALID_PASSWORD("INVALID_PASSWORD", HttpStatus.BAD_REQUEST),
    UNAUTHORIZED("UNAUTHORIZED", HttpStatus.FORBIDDEN);

    private final String message;
    private final HttpStatus code;

    UserExceptions(String message, HttpStatus code) {
        this.message = message;
        this.code = code;
    }

    public UserException getUserException() {
        return new UserException(message, code);
    }

    public UserException getUserException(String changeMessage) {
        return new UserException(changeMessage, code);
    }
}