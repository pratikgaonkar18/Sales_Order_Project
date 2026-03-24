package com.turbocorp.orderworkflow.common;

import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(NotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleBadRequest(IllegalArgumentException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        FieldError fieldError = ex.getBindingResult().getFieldErrors().stream().findFirst().orElse(null);
        String message = fieldError != null
                ? fieldError.getField() + " " + fieldError.getDefaultMessage()
                : "Validation failed";
        return buildResponse(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseEntity<ApiError> buildResponse(HttpStatus status, String message) {
        ApiError error = new ApiError(LocalDateTime.now(), status.value(), status.getReasonPhrase(), message);
        return ResponseEntity.status(status).body(error);
    }
}
