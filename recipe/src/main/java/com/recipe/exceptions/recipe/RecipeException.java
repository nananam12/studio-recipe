package com.recipe.exceptions.recipe;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class RecipeException extends RuntimeException {
    private final String msg;
    private final HttpStatus code;

    public RecipeException(String msg, HttpStatus code) {
        super(msg);
        this.msg = msg;
        this.code = code;
    }

    public RecipeException(String msg) {
        super(msg);
        this.msg = msg;
        this.code = HttpStatus.BAD_REQUEST;
    }
}