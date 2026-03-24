package com.turbocorp.orderworkflow.common;

public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
