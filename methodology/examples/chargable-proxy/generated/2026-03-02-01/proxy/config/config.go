package config

import (
	"flag"
	"os"
)

type Config struct {
	ListenAddr  string
	ManagerURL  string
	Domain      string
	ResAddr     string
	MetricsAddr string
	Verbose     bool
}

func Parse() *Config {
	c := &Config{}
	flag.StringVar(&c.ListenAddr, "listen", envOr("PROXY_LISTEN", ":3128"), "proxy listen address")
	flag.StringVar(&c.ManagerURL, "manager", envOr("MANAGER_URL", "http://localhost:8080"), "manager server URL")
	flag.StringVar(&c.Domain, "domain", envOr("PROXY_DOMAIN", "localhost:3128"), "proxy domain (host:port)")
	flag.StringVar(&c.ResAddr, "resaddr", envOr("RES_ADDR", "http://127.0.0.1:8080"), "local resource service address")
	flag.StringVar(&c.MetricsAddr, "metrics", envOr("METRICS_ADDR", ":9090"), "prometheus metrics address")
	flag.BoolVar(&c.Verbose, "verbose", false, "verbose logging")
	flag.Parse()
	return c
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
