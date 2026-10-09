package com.aiinterview.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories(basePackages = "com.aiinterview.backend")
public class AiInterviewSystemBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(AiInterviewSystemBackendApplication.class, args);
	}

}
