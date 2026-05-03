package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	ProxyRequests = promauto.NewCounter(prometheus.CounterOpts{
		Name: "proxy_requests_total",
		Help: "Total number of proxy requests",
	})

	AuthFailures = promauto.NewCounter(prometheus.CounterOpts{
		Name: "proxy_auth_failures_total",
		Help: "Total number of authentication failures",
	})

	BytesTransferred = promauto.NewCounter(prometheus.CounterOpts{
		Name: "proxy_bytes_transferred_total",
		Help: "Total bytes transferred through proxy",
	})

	ActiveConnections = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "proxy_active_connections",
		Help: "Number of active proxy connections",
	})

	DataLoadErrors = promauto.NewCounter(prometheus.CounterOpts{
		Name: "proxy_data_load_errors_total",
		Help: "Total number of data loading errors",
	})
)
