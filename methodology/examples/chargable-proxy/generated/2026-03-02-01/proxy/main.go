package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/prometheus/client_golang/prometheus/promhttp"

	"chargable-proxy/proxy/auth"
	"chargable-proxy/proxy/config"
	"chargable-proxy/proxy/handler"
	"chargable-proxy/proxy/manager"
	"chargable-proxy/proxy/metrics"
	proxySync "chargable-proxy/proxy/sync"
)

func main() {
	cfg := config.Parse()

	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Printf("Starting proxy on %s, domain=%s, manager=%s", cfg.ListenAddr, cfg.Domain, cfg.ManagerURL)

	client := manager.NewClient(cfg.ManagerURL)

	instance, err := client.RegisterInstance(cfg.Domain)
	if err != nil {
		log.Fatalf("Failed to register proxy instance: %v", err)
	}
	log.Printf("Registered as instance ID=%d", instance.ID)

	authStore := auth.NewStore()
	syncer := proxySync.NewSyncer(client, instance.ID, cfg.Domain)
	syncer.Start()

	go pollData(client, authStore, cfg.Verbose)

	proxyHandler := handler.NewProxyHandler(authStore, syncer, cfg.ResAddr, cfg.Verbose)

	go func() {
		mux := http.NewServeMux()
		mux.Handle("/metrics", promhttp.Handler())
		mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("ok"))
		})
		log.Printf("Metrics server on %s", cfg.MetricsAddr)
		if err := http.ListenAndServe(cfg.MetricsAddr, mux); err != nil {
			log.Fatalf("Metrics server error: %v", err)
		}
	}()

	server := &http.Server{
		Addr:    cfg.ListenAddr,
		Handler: proxyHandler,
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigCh
		log.Println("Shutting down...")
		syncer.Stop()
		server.Close()
	}()

	log.Printf("Proxy listening on %s", cfg.ListenAddr)
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

func pollData(client *manager.Client, store *auth.Store, verbose bool) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	load := func() {
		entries, err := client.GetAvailablePackages()
		if err != nil {
			log.Printf("[POLL] Failed to load data: %v", err)
			metrics.DataLoadErrors.Inc()
			return
		}
		store.Update(entries)
		if verbose {
			log.Printf("[POLL] Loaded %d users", len(entries))
		}
	}

	load()
	for range ticker.C {
		load()
	}
}
