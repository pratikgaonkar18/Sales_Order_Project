package com.turbocorp.orderworkflow.common;

import java.time.LocalDateTime;

public record ApiError(LocalDateTime timestamp, int status, String error, String message) {
}
