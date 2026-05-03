package auth

import (
	"encoding/base64"
	"net/http"
	"strings"
	"sync"

	"chargable-proxy/proxy/manager"
)

type UserInfo struct {
	Username string
	Password string
	HasPkg   bool
}

type Store struct {
	mu    sync.RWMutex
	users map[string]*UserInfo // keyed by username
}

func NewStore() *Store {
	return &Store{users: make(map[string]*UserInfo)}
}

func (s *Store) Update(entries []manager.AvailablePackageEntry) {
	m := make(map[string]*UserInfo, len(entries))
	for _, e := range entries {
		m[e.Username] = &UserInfo{
			Username: e.Username,
			Password: e.Password,
			HasPkg:   len(e.Packages) > 0,
		}
	}
	s.mu.Lock()
	s.users = m
	s.mu.Unlock()
}

func (s *Store) Authenticate(r *http.Request) (*UserInfo, bool) {
	proxyAuth := r.Header.Get("Proxy-Authorization")
	if proxyAuth == "" {
		return nil, false
	}
	username, password, ok := parseBasicAuth(proxyAuth)
	if !ok {
		return nil, false
	}
	s.mu.RLock()
	user, exists := s.users[username]
	s.mu.RUnlock()
	if !exists {
		return nil, false
	}
	if user.Password != password {
		return nil, false
	}
	return user, true
}

func parseBasicAuth(auth string) (string, string, bool) {
	const prefix = "Basic "
	if !strings.HasPrefix(auth, prefix) {
		return "", "", false
	}
	decoded, err := base64.StdEncoding.DecodeString(auth[len(prefix):])
	if err != nil {
		return "", "", false
	}
	parts := strings.SplitN(string(decoded), ":", 2)
	if len(parts) != 2 {
		return "", "", false
	}
	return parts[0], parts[1], true
}

func ProxyAuthRequired(w http.ResponseWriter) {
	w.Header().Set("Proxy-Authenticate", `Basic realm="proxy"`)
	w.WriteHeader(http.StatusProxyAuthRequired)
}
