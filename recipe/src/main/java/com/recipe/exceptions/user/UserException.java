package com.recipe.exceptions.user;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class UserException extends RuntimeException {
    private final String msg;
    private final HttpStatus code;

    public UserException(String msg, HttpStatus code) {
        super(msg);
        this.msg = msg;
        this.code = code;
    }

    public UserException(String msg) {
        super(msg);
        this.msg = msg;
        this.code = HttpStatus.BAD_REQUEST;
    }
}