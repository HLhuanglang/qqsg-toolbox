package service

import (
	"encoding/json"
	"fmt"
	"maps"
	"os"
	"path/filepath"
	"runtime"
	"sync"
)

// KVStore 持久化所有"qqsg.*"前缀的前端键值数据。
//
// 存储形式：单个 JSON 文件，全量读写。
//
//   - Windows: %APPDATA%\qqsg-toolbox\store.json
//   - macOS:   $HOME/Library/Application Support/qqsg-toolbox/store.json
//   - 其它:    $XDG_CONFIG_HOME/qqsg-toolbox/store.json 或 $HOME/.config/qqsg-toolbox/store.json
//
// 这样 `wails dev` 与 `wails build` 后的运行时使用相同路径，数据互通。
type KVStore struct {
	mu       sync.RWMutex
	filePath string
	data     map[string]string
	loaded   bool
}

// NewKVStore 仅记录文件路径，不立即加载文件。
func NewKVStore() *KVStore {
	return &KVStore{
		filePath: defaultStorePath(),
		data:     map[string]string{},
	}
}

// Path 返回 store.json 的绝对路径，用于排查 / 在前端展示。
func (s *KVStore) Path() string {
	return s.filePath
}

// Load 从磁盘加载到内存。文件不存在返回空 map（不视为错误）。
func (s *KVStore) Load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.loaded = true
	s.data = map[string]string{}

	if s.filePath == "" {
		return nil
	}
	raw, err := os.ReadFile(s.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("read kv store: %w", err)
	}
	if len(raw) == 0 {
		return nil
	}
	var parsed map[string]string
	if err := json.Unmarshal(raw, &parsed); err != nil {
		// 文件损坏：备份后重置，避免阻塞应用
		_ = os.Rename(s.filePath, s.filePath+".corrupted")
		return fmt.Errorf("parse kv store (backed up as .corrupted): %w", err)
	}
	if parsed != nil {
		s.data = parsed
	}
	return nil
}

// Get 读取单个 key；不存在则返回 ("", false)。
func (s *KVStore) Get(key string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.data[key]
	return v, ok
}

// All 返回当前内存中所有 KV 的浅拷贝。
func (s *KVStore) All() map[string]string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make(map[string]string, len(s.data))
	maps.Copy(out, s.data)
	return out
}

// Set 写入并落盘。
func (s *KVStore) Set(key, value string) error {
	if key == "" {
		return fmt.Errorf("kv: empty key")
	}
	s.mu.Lock()
	s.data[key] = value
	err := s.flushLocked()
	s.mu.Unlock()
	return err
}

// Delete 删除指定 key 并落盘。
func (s *KVStore) Delete(key string) error {
	s.mu.Lock()
	if _, ok := s.data[key]; !ok {
		s.mu.Unlock()
		return nil
	}
	delete(s.data, key)
	err := s.flushLocked()
	s.mu.Unlock()
	return err
}

// Clear 清空全部数据并落盘（用于"重置应用数据"）。
func (s *KVStore) Clear() error {
	s.mu.Lock()
	s.data = map[string]string{}
	err := s.flushLocked()
	s.mu.Unlock()
	return err
}

// flushLocked 必须在持有写锁的情况下调用。
// 采用 "写临时文件 → rename" 的原子写策略，避免半写入坏数据。
func (s *KVStore) flushLocked() error {
	if s.filePath == "" {
		return fmt.Errorf("kv: empty store path")
	}
	if err := os.MkdirAll(filepath.Dir(s.filePath), 0o755); err != nil {
		return fmt.Errorf("mkdir store dir: %w", err)
	}
	buf, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal kv: %w", err)
	}
	tmp := s.filePath + ".tmp"
	if err := os.WriteFile(tmp, buf, 0o644); err != nil {
		return fmt.Errorf("write tmp: %w", err)
	}
	if err := os.Rename(tmp, s.filePath); err != nil {
		// Windows 下 rename 目标存在时会失败，先删除再重命名
		_ = os.Remove(s.filePath)
		if err2 := os.Rename(tmp, s.filePath); err2 != nil {
			return fmt.Errorf("rename: %w", err2)
		}
	}
	return nil
}

// defaultStorePath 选定与平台习惯一致的应用数据目录。
func defaultStorePath() string {
	const appDirName = "qqsg-toolbox"

	switch runtime.GOOS {
	case "windows":
		// 优先 %APPDATA% (Roaming)；不存在再 fallback
		if v := os.Getenv("APPDATA"); v != "" {
			return filepath.Join(v, appDirName, "store.json")
		}
	case "darwin":
		if home, err := os.UserHomeDir(); err == nil {
			return filepath.Join(home, "Library", "Application Support", appDirName, "store.json")
		}
	default: // linux / *bsd
		if v := os.Getenv("XDG_CONFIG_HOME"); v != "" {
			return filepath.Join(v, appDirName, "store.json")
		}
		if home, err := os.UserHomeDir(); err == nil {
			return filepath.Join(home, ".config", appDirName, "store.json")
		}
	}

	// 最后的 fallback：可执行文件同级目录
	if exe, err := os.Executable(); err == nil {
		return filepath.Join(filepath.Dir(exe), appDirName, "store.json")
	}
	return filepath.Join(".", appDirName, "store.json")
}
