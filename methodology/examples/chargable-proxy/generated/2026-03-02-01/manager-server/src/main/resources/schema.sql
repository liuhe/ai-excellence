CREATE TABLE IF NOT EXISTS proxy_user (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(64)  NOT NULL,
    password    VARCHAR(64)  NOT NULL,
    UNIQUE KEY uk_username (username)
);

CREATE TABLE IF NOT EXISTS proxy_package (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(64)  NOT NULL,
    domain          VARCHAR(128) NOT NULL,
    type            VARCHAR(32)  NOT NULL,
    quota           BIGINT       NOT NULL DEFAULT 0,
    effective_days  INT          NOT NULL DEFAULT 0,
    used_quota      BIGINT       NOT NULL DEFAULT 0,
    status          VARCHAR(16)  NOT NULL DEFAULT 'Pending',
    activate_time   BIGINT       NOT NULL DEFAULT 0,
    expire_time     BIGINT       NOT NULL DEFAULT 0,
    INDEX idx_pkg_username (username),
    INDEX idx_pkg_domain_status (domain, status)
);

CREATE TABLE IF NOT EXISTS proxy_coupon (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(32)  NOT NULL,
    domain          VARCHAR(128) NOT NULL,
    type            VARCHAR(32)  NOT NULL,
    quota           BIGINT       NOT NULL DEFAULT 0,
    effective_days  INT          NOT NULL DEFAULT 0,
    bound_username  VARCHAR(64),
    bound_time      BIGINT       NOT NULL DEFAULT 0,
    UNIQUE KEY uk_code (code)
);

CREATE TABLE IF NOT EXISTS proxy_request (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    proxy_instance_id   BIGINT       NOT NULL,
    proxy_domain        VARCHAR(128) NOT NULL,
    local_request_id    BIGINT       NOT NULL,
    username            VARCHAR(64)  NOT NULL,
    client_addr         VARCHAR(64),
    host                VARCHAR(256),
    path                VARCHAR(1024),
    user_agent          VARCHAR(512),
    sec_ch_ua           VARCHAR(256),
    tags                VARCHAR(128),
    read_bytes          BIGINT       NOT NULL DEFAULT 0,
    UNIQUE KEY uk_instance_local (proxy_instance_id, local_request_id),
    INDEX idx_req_username (username)
);

CREATE TABLE IF NOT EXISTS proxy_instance (
    id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    domain  VARCHAR(128) NOT NULL
);
