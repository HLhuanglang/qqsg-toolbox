package backend

import (
	"context"
	"embed"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/HLhuanglang/qqsg-toolbox/backend/entity"
	"github.com/HLhuanglang/qqsg-toolbox/backend/service"
	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx           context.Context
	embeddedData  embed.FS
	dataFS        fs.FS
	dataDirOnDisk string // 仅当从磁盘加载时记录路径，方便排查
	soulService   *service.SoulService
	kv            *service.KVStore
}

// NewApp creates a new App application struct.
// dataFS 是构建期通过 //go:embed all:data 注入的只读文件系统。
func NewApp(dataFS embed.FS) *App {
	return &App{
		embeddedData: dataFS,
		kv:           service.NewKVStore(),
	}
}

// Startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.resolveDataFS()
	a.soulService = service.NewSoulService(a.dataFS)
	if err := a.kv.Load(); err != nil {
		runtime.LogWarningf(a.ctx, "KV store 加载失败: %v", err)
	} else {
		runtime.LogInfof(a.ctx, "KV store 路径: %s", a.kv.Path())
	}
	a.startDataWatcher()
}

// ─────────────────── KV 持久化（前端调用） ───────────────────

// KVGetAll 返回所有持久化的键值，前端启动时一次性载入内存缓存。
func (a *App) KVGetAll() (map[string]string, error) {
	return a.kv.All(), nil
}

// KVGet 读取单个 key。不存在则返回空字符串。
func (a *App) KVGet(key string) (string, error) {
	v, _ := a.kv.Get(key)
	return v, nil
}

// KVSet 写入单个 key，立即落盘。
func (a *App) KVSet(key, value string) error {
	if err := a.kv.Set(key, value); err != nil {
		runtime.LogErrorf(a.ctx, "KVSet(%s) 失败: %v", key, err)
		return err
	}
	return nil
}

// KVDelete 删除单个 key。
func (a *App) KVDelete(key string) error {
	if err := a.kv.Delete(key); err != nil {
		runtime.LogErrorf(a.ctx, "KVDelete(%s) 失败: %v", key, err)
		return err
	}
	return nil
}

// KVClear 清空所有 KV（用于"重置应用数据"）。
func (a *App) KVClear() error {
	if err := a.kv.Clear(); err != nil {
		runtime.LogErrorf(a.ctx, "KVClear 失败: %v", err)
		return err
	}
	return nil
}

// KVStorePath 暴露存储文件路径，便于在"设置"页展示与排查。
func (a *App) KVStorePath() string {
	return a.kv.Path()
}

// GetDataDir returns the resolved data source description.
// 若使用磁盘数据则返回绝对路径，否则返回 "(embedded)"。
func (a *App) GetDataDir() string {
	if a.dataDirOnDisk != "" {
		return a.dataDirOnDisk
	}
	return "(embedded)"
}

// ListDataFiles 列出 data/ 下所有 .json 文件（递归）。
// 同时支持磁盘模式与嵌入模式。
func (a *App) ListDataFiles() ([]entity.DataFileInfo, error) {
	if a.dataFS == nil {
		return []entity.DataFileInfo{}, nil
	}
	var out []entity.DataFileInfo
	err := fs.WalkDir(a.dataFS, ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(strings.ToLower(p), ".json") {
			return nil
		}
		info, ferr := d.Info()
		var size int64
		if ferr == nil {
			size = info.Size()
		}
		out = append(out, entity.DataFileInfo{Path: filepath.ToSlash(p), Size: size})
		return nil
	})
	if err != nil {
		runtime.LogErrorf(a.ctx, "ListDataFiles 失败: %v", err)
		return nil, err
	}
	return out, nil
}

// ReadDataFile 读取 data/ 下单个 JSON 文件原文。
// path 必须使用相对路径（如 "soul/levels.json"），禁止 ".." 上跳。
func (a *App) ReadDataFile(path string) (string, error) {
	if a.dataFS == nil {
		return "", nil
	}
	clean := filepath.ToSlash(filepath.Clean(path))
	if clean == "." || strings.HasPrefix(clean, "..") || strings.Contains(clean, "../") || filepath.IsAbs(clean) {
		return "", os.ErrPermission
	}
	if !strings.HasSuffix(strings.ToLower(clean), ".json") {
		return "", os.ErrInvalid
	}
	data, err := fs.ReadFile(a.dataFS, clean)
	if err != nil {
		runtime.LogErrorf(a.ctx, "ReadDataFile(%s) 失败: %v", clean, err)
		return "", err
	}
	return string(data), nil
}

// GetSoulCatalog 读取灵魂图鉴数据
func (a *App) GetSoulCatalog() (*entity.SoulCatalogData, error) {
	data, err := a.soulService.GetSoulCatalog()
	if err != nil {
		runtime.LogErrorf(a.ctx, "GetSoulCatalog 失败: %v", err)
	}
	return data, err
}

// GetSoulLevels 读取灵魂等级数据
func (a *App) GetSoulLevels() ([]entity.SoulLevelRow, error) {
	data, err := a.soulService.GetSoulLevels()
	if err != nil {
		runtime.LogErrorf(a.ctx, "GetSoulLevels 失败: %v", err)
	}
	return data, err
}

// GetSoulAwaken 读取开灵属性数据
func (a *App) GetSoulAwaken() (*entity.SoulAwakenData, error) {
	data, err := a.soulService.GetSoulAwaken()
	if err != nil {
		runtime.LogErrorf(a.ctx, "GetSoulAwaken 失败: %v", err)
	}
	return data, err
}

// resolveDataFS 决定运行期 dataFS 来源：
//  1. 优先使用磁盘上的 data/ 目录（便于开发期热改 JSON）
//  2. 找不到则回退到构建期嵌入的 embed.FS
func (a *App) resolveDataFS() {
	candidates := []string{
		"data",
		filepath.Join("..", "data"),
		filepath.Join("..", "..", "data"),
	}

	if exePath, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exePath)
		candidates = append(candidates,
			filepath.Join(exeDir, "data"),
			filepath.Join(exeDir, "..", "data"),
			filepath.Join(exeDir, "..", "..", "data"),
		)
	}

	for _, dir := range candidates {
		if _, err := os.Stat(filepath.Join(dir, "soul")); err == nil {
			abs, _ := filepath.Abs(dir)
			a.dataDirOnDisk = abs
			a.dataFS = os.DirFS(abs)
			return
		}
	}

	// 回退到嵌入数据。embed 时根目录即 "data"，需 Sub 一层使路径与磁盘模式一致。
	if sub, err := fs.Sub(a.embeddedData, "data"); err == nil {
		a.dataFS = sub
	} else {
		a.dataFS = a.embeddedData
	}
}

// startDataWatcher 监听 data/ 目录下 JSON 文件变化，
// 变化时通过 Wails 事件总线广播 "data:changed"，前端可订阅做实时刷新。
// 仅当从磁盘加载（开发期）时启动，嵌入模式下不会触发。
func (a *App) startDataWatcher() {
	if a.dataDirOnDisk == "" {
		return
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		runtime.LogWarningf(a.ctx, "data watcher 创建失败: %v", err)
		return
	}

	// 递归把 data/ 下所有目录加入监听
	_ = filepath.Walk(a.dataDirOnDisk, func(path string, info os.FileInfo, err error) error {
		if err != nil || info == nil {
			return nil
		}
		if info.IsDir() {
			_ = watcher.Add(path)
		}
		return nil
	})

	go func() {
		defer watcher.Close()

		// 简单的去抖：编辑器保存可能短时间触发多次事件
		var (
			pending bool
			timer   *time.Timer
		)
		const debounce = 200 * time.Millisecond

		fire := func(file string) {
			runtime.LogInfof(a.ctx, "data changed: %s", file)
			runtime.EventsEmit(a.ctx, "data:changed", file)
		}

		for {
			select {
			case <-a.ctx.Done():
				return

			case ev, ok := <-watcher.Events:
				if !ok {
					return
				}
				if !strings.HasSuffix(strings.ToLower(ev.Name), ".json") {
					continue
				}
				// 忽略纯 CHMOD（VSCode 保存时常会先 chmod 再 write）
				if ev.Op == fsnotify.Chmod {
					continue
				}
				lastFile := ev.Name
				pending = true
				if timer != nil {
					timer.Stop()
				}
				timer = time.AfterFunc(debounce, func() {
					if pending {
						pending = false
						fire(lastFile)
					}
				})

			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				runtime.LogWarningf(a.ctx, "data watcher 错误: %v", err)
			}
		}
	}()
}
