package com.CoudPix.CloudPix_backend.services;

import java.util.Optional;
import java.util.UUID;

import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.dto.UserResponse;
import com.CoudPix.CloudPix_backend.exception.UnauthorizedException;
import com.CoudPix.CloudPix_backend.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;





@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserResponse getUserResponseByEmail(String email) {
        return toUserResponse(getByEmail(email));
    }

    public User getByEmail(String email) {
        return userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }

    public Optional<String> findEmailById(UUID userId) {
        return userRepository.findById(userId).map(User::getEmail);
    }

    public boolean existsById(UUID userId) {
        return userRepository.existsById(userId);
    }

    public UserResponse toUserResponse(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName());
    }
}