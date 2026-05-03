package com.proxy.manager.controller;

import com.proxy.manager.common.ApiResponse;
import com.proxy.manager.domain.Account;
import com.proxy.manager.domain.Coupon;
import com.proxy.manager.service.AccountService;
import com.proxy.manager.service.CouponService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AccountService accountService;
    private final CouponService couponService;

    public AdminController(AccountService accountService, CouponService couponService) {
        this.accountService = accountService;
        this.couponService = couponService;
    }

    public record CreateAccountsRequest(String adminKey, String idPrefix, int count,
                                         String domain, String type, long quota, int effectiveDays) {}

    @PostMapping("/accounts")
    public ApiResponse<List<Map<String, String>>> createAccounts(@RequestBody CreateAccountsRequest req) {
        try {
            List<Account> accounts = accountService.createAccounts(
                    req.adminKey(), req.idPrefix(), req.count(),
                    req.domain(), req.type(), req.quota(), req.effectiveDays());
            List<Map<String, String>> result = accounts.stream()
                    .map(a -> Map.of("username", a.username(), "password", a.password()))
                    .toList();
            return ApiResponse.success(result);
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(e.getMessage());
        }
    }

    public record CreateCouponsRequest(String adminKey, String domain, String type,
                                        long quota, int effectiveDays, int count) {}

    @PostMapping("/coupons")
    public ApiResponse<List<String>> createCoupons(@RequestBody CreateCouponsRequest req) {
        try {
            List<Coupon> coupons = couponService.createCoupons(
                    req.adminKey(), req.domain(), req.type(),
                    req.quota(), req.effectiveDays(), req.count());
            List<String> codes = coupons.stream().map(Coupon::code).toList();
            return ApiResponse.success(codes);
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(e.getMessage());
        }
    }
}
