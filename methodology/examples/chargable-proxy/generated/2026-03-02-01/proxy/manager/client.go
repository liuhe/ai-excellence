package manager

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type ProxyInstance struct {
	ID     int64  `json:"id"`
	Domain string `json:"domain"`
}

type Package struct {
	ID            int64  `json:"id"`
	Domain        string `json:"domain"`
	Type          string `json:"type"`
	Quota         int64  `json:"quota"`
	EffectiveDays int    `json:"effectiveDays"`
	UsedQuota     int64  `json:"usedQuota"`
	Status        string `json:"status"`
}

type AvailablePackageEntry struct {
	Username string    `json:"username"`
	Password string    `json:"password"`
	Packages []Package `json:"packages"`
}

type SyncRequest struct {
	ProxyInstanceID int64  `json:"proxyInstanceId"`
	ProxyDomain     string `json:"proxyDomain"`
	LocalRequestID  int64  `json:"localRequestId"`
	Username        string `json:"username"`
	ClientAddr      string `json:"clientAddr"`
	Host            string `json:"host"`
	Path            string `json:"path"`
	UserAgent       string `json:"userAgent"`
	SecChUa         string `json:"secChUa"`
	Tags            string `json:"tags"`
	ReadBytes       int64  `json:"readBytes"`
}

func (c *Client) RegisterInstance(domain string) (*ProxyInstance, error) {
	body, _ := json.Marshal(map[string]string{"domain": domain})
	resp, err := c.httpClient.Post(c.baseURL+"/api/internal/register-instance", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("register instance: %w", err)
	}
	defer resp.Body.Close()
	var inst ProxyInstance
	if err := json.NewDecoder(resp.Body).Decode(&inst); err != nil {
		return nil, fmt.Errorf("decode register response: %w", err)
	}
	return &inst, nil
}

func (c *Client) GetAvailablePackages() ([]AvailablePackageEntry, error) {
	resp, err := c.httpClient.Get(c.baseURL + "/api/internal/available-packages")
	if err != nil {
		return nil, fmt.Errorf("get available packages: %w", err)
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	var entries []AvailablePackageEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, fmt.Errorf("decode packages: %w", err)
	}
	return entries, nil
}

func (c *Client) SyncUsage(requests []SyncRequest) error {
	body, _ := json.Marshal(requests)
	resp, err := c.httpClient.Post(c.baseURL+"/api/internal/sync-usage", "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("sync usage: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		data, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sync usage failed: %s", string(data))
	}
	return nil
}
