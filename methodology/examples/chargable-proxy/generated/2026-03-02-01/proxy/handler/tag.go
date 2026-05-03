package handler

import (
	"strings"
)

func ComputeTag(host, path, userAgent string) string {
	hostLower := strings.ToLower(host)

	if strings.HasSuffix(hostLower, ".nintendo.com") || strings.HasSuffix(hostLower, ".nintendo.net") {
		return "nintendo"
	}

	uaLower := strings.ToLower(userAgent)
	if strings.Contains(uaLower, "nn") &&
		strings.HasSuffix(hostLower, ".amazonaws.com") &&
		strings.Contains(strings.ToLower(path), "upload") {
		return "nintendo"
	}

	return "freedom"
}
