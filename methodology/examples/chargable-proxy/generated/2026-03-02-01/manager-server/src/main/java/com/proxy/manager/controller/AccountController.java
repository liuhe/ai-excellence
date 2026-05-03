package com.proxy.manager.controller;

import com.proxy.manager.common.ApiResponse;
import com.proxy.manager.domain.ProxyPackage;
import com.proxy.manager.service.AccountService;
import com.proxy.manager.service.CouponService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final AccountService accountService;
    private final CouponService couponService;

    public AccountController(AccountService accountService, CouponService couponService) {
        this.accountService = accountService;
        this.couponService = couponService;
    }

    public record QueryRequest(String username, String password) {}

    public record AccountDetailResponse(String username, List<PackageView> packages) {}

    public record PackageView(Long id, String domain, String type, long quota, int effectiveDays,
                               long usedQuota, String status, long activateTime, long expireTime) {
        public static PackageView from(ProxyPackage p) {
            return new PackageView(p.id(), p.domain(), p.type(), p.quota(), p.effectiveDays(),
                    p.usedQuota(), p.effectiveStatus().name(), p.activateTime(), p.expireTime());
        }
    }

    @PostMapping("/query")
    public ApiResponse<AccountDetailResponse> query(@RequestBody QueryRequest req) {
        try {
            AccountService.AccountDetail detail = accountService.queryAccountDetail(req.username(), req.password());
            List<PackageView> views = detail.packages().stream().map(PackageView::from).toList();
            return ApiResponse.success(new AccountDetailResponse(detail.username(), views));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(e.getMessage());
        }
    }

    public record BindRequest(String username, String password, String couponCode) {}

    @PostMapping("/bindPackage")
    public ApiResponse<PackageView> bindPackage(@RequestBody BindRequest req) {
        try {
            accountService.authenticate(req.username(), req.password());
            ProxyPackage pkg = couponService.redeemCoupon(req.username(), req.couponCode());
            return ApiResponse.success(PackageView.from(pkg));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(e.getMessage());
        }
    }
}
