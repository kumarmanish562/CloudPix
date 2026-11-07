package com.CoudPix.CloudPix_backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "app.mail")
public record MailProperties(
        @DefaultValue("noreply@cloudpix.app") String from,
        @DefaultValue("http://localhost:3000") String frontendUrl,
        @DefaultValue("true") boolean enabled
) {
}

