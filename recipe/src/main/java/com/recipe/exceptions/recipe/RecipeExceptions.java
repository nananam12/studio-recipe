package com.recipe.exceptions.recipe;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum RecipeExceptions {
    NOT_FOUND("해당 레시피를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    BAD_REQUEST("요청 값이 잘못되었습니다.", HttpStatus.BAD_REQUEST);

    private final String message;
    private final HttpStatus code;

    RecipeExceptions(String message, HttpStatus code) {
        this.message = message;
        this.code = code;
    }

    public RecipeException getRecipeException() {
        return new RecipeException(message, code);
    }

    public RecipeException getRecipeException(String changeMessage) {
        return new RecipeException(changeMessage, code);
    }
}