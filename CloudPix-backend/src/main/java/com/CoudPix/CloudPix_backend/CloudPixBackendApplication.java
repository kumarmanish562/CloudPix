package com.CoudPix.CloudPix_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CloudPixBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(CloudPixBackendApplication.class, args);
	}

}
