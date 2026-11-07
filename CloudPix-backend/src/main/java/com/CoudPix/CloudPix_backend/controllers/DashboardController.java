package com.CoudPix.CloudPix_backend.controllers;

import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.dto.DashboardSummaryResponse;
import com.CoudPix.CloudPix_backend.services.DashboardService;
import com.CoudPix.CloudPix_backend.services.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserService userService;

    public DashboardController(DashboardService dashboardService, UserService userService) {
        this.dashboardService = dashboardService;
        this.userService = userService;
    }

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryResponse> getSummary(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        DashboardSummaryResponse response = dashboardService.getDashboardSummary(user.getId());
        return ResponseEntity.ok(response);
    }
}

