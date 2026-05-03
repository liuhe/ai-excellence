package handler

import (
	"io"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync/atomic"

	"chargable-proxy/proxy/auth"
	"chargable-proxy/proxy/metrics"
	"chargable-proxy/proxy/sync"
)

type ProxyHandler struct {
	authStore  *auth.Store
	syncer     *sync.Syncer
	resAddr    string
	verbose    bool
	localReqID atomic.Int64
}

func NewProxyHandler(authStore *auth.Store, syncer *sync.Syncer, resAddr string, verbose bool) *ProxyHandler {
	return &ProxyHandler{
		authStore: authStore,
		syncer:    syncer,
		resAddr:   resAddr,
		verbose:   verbose,
	}
}

func (h *ProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if isProxyRequest(r) {
		h.handleProxy(w, r)
	} else {
		h.handleLocal(w, r)
	}
}

func isProxyRequest(r *http.Request) bool {
	if r.Method == http.MethodConnect {
		return true
	}
	return r.URL.Host != "" && r.URL.IsAbs()
}

func (h *ProxyHandler) handleLocal(w http.ResponseWriter, r *http.Request) {
	target, err := url.Parse(h.resAddr)
	if err != nil {
		http.Error(w, "bad resaddr", http.StatusInternalServerError)
		return
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.ServeHTTP(w, r)
}

func (h *ProxyHandler) handleProxy(w http.ResponseWriter, r *http.Request) {
	user, ok := h.authStore.Authenticate(r)
	if !ok {
		auth.ProxyAuthRequired(w)
		metrics.AuthFailures.Inc()
		return
	}

	if !user.HasPkg {
		auth.ProxyAuthRequired(w)
		return
	}

	metrics.ProxyRequests.Inc()

	if r.Method == http.MethodConnect {
		h.handleConnect(w, r, user)
	} else {
		h.handleHTTP(w, r, user)
	}
}

func (h *ProxyHandler) handleConnect(w http.ResponseWriter, r *http.Request, user *auth.UserInfo) {
	destConn, err := net.Dial("tcp", r.Host)
	if err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	hijacker, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "hijacking not supported", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	clientConn, _, err := hijacker.Hijack()
	if err != nil {
		destConn.Close()
		return
	}

	reqID := h.localReqID.Add(1)
	tag := ComputeTag(r.Host, "", r.Header.Get("User-Agent"))

	var readBytes int64
	go func() {
		n, _ := io.Copy(destConn, clientConn)
		_ = n
		destConn.Close()
	}()

	n, _ := io.Copy(clientConn, destConn)
	readBytes = n
	clientConn.Close()

	host := r.Host
	if idx := strings.LastIndex(host, ":"); idx > 0 {
		host = host[:idx]
	}

	h.syncer.Record(sync.RequestRecord{
		LocalRequestID: reqID,
		Username:       user.Username,
		ClientAddr:     r.RemoteAddr,
		Host:           r.Host,
		Path:           "",
		UserAgent:      r.Header.Get("User-Agent"),
		SecChUa:        r.Header.Get("Sec-Ch-Ua"),
		Tags:           tag,
		ReadBytes:      readBytes,
	})

	metrics.BytesTransferred.Add(float64(readBytes))

	if h.verbose {
		log.Printf("[CONNECT] user=%s host=%s tag=%s bytes=%d", user.Username, r.Host, tag, readBytes)
	}
}

func (h *ProxyHandler) handleHTTP(w http.ResponseWriter, r *http.Request, user *auth.UserInfo) {
	r.Header.Del("Proxy-Authorization")
	r.Header.Del("Proxy-Connection")

	resp, err := http.DefaultTransport.RoundTrip(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	for key, values := range resp.Header {
		for _, v := range values {
			w.Header().Add(key, v)
		}
	}
	w.WriteHeader(resp.StatusCode)

	counter := &countingWriter{w: w}
	io.Copy(counter, resp.Body)

	reqID := h.localReqID.Add(1)
	tag := ComputeTag(r.URL.Host, r.URL.Path, r.Header.Get("User-Agent"))

	h.syncer.Record(sync.RequestRecord{
		LocalRequestID: reqID,
		Username:       user.Username,
		ClientAddr:     r.RemoteAddr,
		Host:           r.URL.Host,
		Path:           r.URL.Path,
		UserAgent:      r.Header.Get("User-Agent"),
		SecChUa:        r.Header.Get("Sec-Ch-Ua"),
		Tags:           tag,
		ReadBytes:      counter.n,
	})

	metrics.BytesTransferred.Add(float64(counter.n))

	if h.verbose {
		log.Printf("[HTTP] user=%s host=%s path=%s tag=%s bytes=%d",
			user.Username, r.URL.Host, r.URL.Path, tag, counter.n)
	}
}

type countingWriter struct {
	w http.ResponseWriter
	n int64
}

func (cw *countingWriter) Write(p []byte) (int, error) {
	n, err := cw.w.Write(p)
	cw.n += int64(n)
	return n, err
}
