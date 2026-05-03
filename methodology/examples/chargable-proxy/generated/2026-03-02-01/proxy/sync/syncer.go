package sync

import (
	"log"
	gosync "sync"
	"time"

	"chargable-proxy/proxy/manager"
)

const (
	syncInterval = 5 * time.Second
	maxBatchSize = 1000
)

type RequestRecord struct {
	LocalRequestID int64
	Username       string
	ClientAddr     string
	Host           string
	Path           string
	UserAgent      string
	SecChUa        string
	Tags           string
	ReadBytes      int64
}

type Syncer struct {
	client     *manager.Client
	instanceID int64
	domain     string

	mu      gosync.Mutex
	buffer  []RequestRecord
	stopCh  chan struct{}
}

func NewSyncer(client *manager.Client, instanceID int64, domain string) *Syncer {
	return &Syncer{
		client:     client,
		instanceID: instanceID,
		domain:     domain,
		buffer:     make([]RequestRecord, 0, maxBatchSize),
		stopCh:     make(chan struct{}),
	}
}

func (s *Syncer) Record(rec RequestRecord) {
	s.mu.Lock()
	s.buffer = append(s.buffer, rec)
	shouldFlush := len(s.buffer) >= maxBatchSize
	s.mu.Unlock()

	if shouldFlush {
		go s.flush()
	}
}

func (s *Syncer) Start() {
	ticker := time.NewTicker(syncInterval)
	go func() {
		for {
			select {
			case <-ticker.C:
				s.flush()
			case <-s.stopCh:
				ticker.Stop()
				s.flush()
				return
			}
		}
	}()
}

func (s *Syncer) Stop() {
	close(s.stopCh)
}

func (s *Syncer) flush() {
	s.mu.Lock()
	if len(s.buffer) == 0 {
		s.mu.Unlock()
		return
	}
	batch := s.buffer
	s.buffer = make([]RequestRecord, 0, maxBatchSize)
	s.mu.Unlock()

	requests := make([]manager.SyncRequest, len(batch))
	for i, rec := range batch {
		requests[i] = manager.SyncRequest{
			ProxyInstanceID: s.instanceID,
			ProxyDomain:     s.domain,
			LocalRequestID:  rec.LocalRequestID,
			Username:        rec.Username,
			ClientAddr:      rec.ClientAddr,
			Host:            rec.Host,
			Path:            rec.Path,
			UserAgent:       rec.UserAgent,
			SecChUa:         rec.SecChUa,
			Tags:            rec.Tags,
			ReadBytes:       rec.ReadBytes,
		}
	}

	if err := s.client.SyncUsage(requests); err != nil {
		log.Printf("[SYNC] failed to sync %d requests: %v", len(requests), err)
		s.mu.Lock()
		s.buffer = append(requests2records(requests), s.buffer...)
		s.mu.Unlock()
	} else {
		log.Printf("[SYNC] synced %d requests", len(requests))
	}
}

func requests2records(reqs []manager.SyncRequest) []RequestRecord {
	records := make([]RequestRecord, len(reqs))
	for i, r := range reqs {
		records[i] = RequestRecord{
			LocalRequestID: r.LocalRequestID,
			Username:       r.Username,
			ClientAddr:     r.ClientAddr,
			Host:           r.Host,
			Path:           r.Path,
			UserAgent:      r.UserAgent,
			SecChUa:        r.SecChUa,
			Tags:           r.Tags,
			ReadBytes:      r.ReadBytes,
		}
	}
	return records
}
